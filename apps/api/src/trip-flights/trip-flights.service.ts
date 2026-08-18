import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { FlightStatusCode, Role, TripFlight } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateTripFlightDto, UpdateTripFlightDto } from './dto/trip-flight.dto';

type Actor = { id: string; role: Role; branchId: string | null };

const STATUS_HEADLINE: Record<FlightStatusCode, string> = {
  SCHEDULED: 'is scheduled',
  ON_TIME: 'is on time',
  DELAYED: 'has been delayed',
  BOARDING: 'is boarding',
  DEPARTED: 'has departed',
  LANDED: 'has landed',
  CANCELLED: 'has been cancelled',
};

/**
 * Flight status for a booking, and the message that goes with each change.
 *
 * A gate change is the one piece of trip information with a genuine deadline —
 * useless five minutes late — so every traveller-visible change is pushed over
 * WhatsApp rather than waiting for them to reopen the app. The app's own cache
 * covers everything that can wait; this can't.
 */
@Injectable()
export class TripFlightsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async findAll(bookingId: string, actor: Actor) {
    await this.loadBooking(bookingId, actor);
    return this.prisma.tripFlight.findMany({
      where: { bookingId },
      orderBy: [{ scheduledDeparture: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async create(bookingId: string, dto: CreateTripFlightDto, actor: Actor) {
    const booking = await this.loadBooking(bookingId, actor);
    await this.assertEventBelongs(dto.eventId, booking.quotation.leadId);
    return this.prisma.tripFlight.create({
      data: {
        ...dto,
        bookingId,
        scheduledDeparture: dto.scheduledDeparture ? new Date(dto.scheduledDeparture) : null,
        revisedDeparture: dto.revisedDeparture ? new Date(dto.revisedDeparture) : null,
      },
    });
  }

  async update(id: string, dto: UpdateTripFlightDto, actor: Actor) {
    const before = await this.prisma.tripFlight.findUnique({ where: { id } });
    if (!before) throw new NotFoundException('Flight not found');
    const booking = await this.loadBooking(before.bookingId, actor);
    await this.assertEventBelongs(dto.eventId, booking.quotation.leadId);

    const { notifyTraveller, ...data } = dto;
    const after = await this.prisma.tripFlight.update({
      where: { id },
      data: {
        ...data,
        ...(dto.scheduledDeparture ? { scheduledDeparture: new Date(dto.scheduledDeparture) } : {}),
        ...(dto.revisedDeparture ? { revisedDeparture: new Date(dto.revisedDeparture) } : {}),
      },
    });

    // Only when something a traveller would act on actually moved. Correcting
    // an internal typo must not buzz a phone at 3am in another timezone, but
    // staff can force a send when they want to restate the situation.
    if (notifyTraveller || this.travellerVisibleChange(before, after)) {
      await this.notify(after);
    }
    return after;
  }

  async remove(id: string, actor: Actor) {
    const existing = await this.prisma.tripFlight.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Flight not found');
    await this.loadBooking(existing.bookingId, actor);
    await this.prisma.tripFlight.delete({ where: { id } });
    return { ok: true };
  }

  private travellerVisibleChange(before: TripFlight, after: TripFlight): boolean {
    const keys = ['status', 'terminal', 'gate', 'baggageBelt', 'note', 'revisedDeparture'] as const;
    return keys.some((key) => {
      const a = before[key];
      const b = after[key];
      if (a instanceof Date || b instanceof Date) {
        return new Date(a as Date).getTime() !== new Date(b as Date).getTime();
      }
      return a !== b;
    });
  }

  private async notify(flight: TripFlight) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: flight.bookingId },
      include: { quotation: { include: { lead: { include: { travelers: true } } } } },
    });
    const lead = booking?.quotation.lead;
    if (!lead) return;

    // Every traveller on the booking, not just the lead contact — a gate change
    // matters to whoever is walking to the gate.
    const numbers = lead.travelers.map((t) => t.phone).filter((p): p is string => Boolean(p));
    const recipients = numbers.length > 0 ? numbers : lead.phone ? [lead.phone] : [];
    if (recipients.length === 0) return;

    const when = flight.revisedDeparture ?? flight.scheduledDeparture;
    const lines = [
      `Flight ${flight.flightNumber} ${STATUS_HEADLINE[flight.status]}.`,
      flight.revisedDeparture ? `\nNew departure: ${this.stamp(flight.revisedDeparture)}` : when ? `\nDeparture: ${this.stamp(when)}` : '',
      flight.terminal ? `\nTerminal: ${flight.terminal}` : '',
      flight.gate ? `\nGate: ${flight.gate}` : '',
      flight.baggageBelt ? `\nBaggage belt: ${flight.baggageBelt}` : '',
      flight.note ? `\n\n${flight.note}` : '',
      `\n\nLive details in your trip app: ${process.env.WEB_ORIGIN}/trip`,
    ];

    for (const to of recipients) {
      await this.notifications.send({
        channel: 'WHATSAPP',
        triggerType: 'trip_flight_update',
        recipient: to,
        // Not deduped: a flight can be delayed, moved, then delayed again, and
        // the traveller needs each one.
        relatedEntity: `trip_flight:${flight.id}`,
        body: lines.filter(Boolean).join(''),
      });
    }
  }

  private stamp(date: Date): string {
    return `${date.toISOString().replace('T', ' ').slice(0, 16)} UTC`;
  }

  /**
   * A flight linked to an event from someone else's itinerary — or from an
   * older plan for the same lead — looks completely fine and then silently
   * fails to move the alarm, which is the one job it has. Caught at entry
   * instead: a wrong id is a 400, not a delay nobody is woken for.
   */
  private async assertEventBelongs(eventId: string | undefined, leadId: string) {
    if (!eventId) return;
    const event = await this.prisma.itineraryPlanEvent.findUnique({
      where: { id: eventId },
      include: { day: { include: { itineraryPlan: { select: { leadId: true } } } } },
    });
    if (!event || event.day.itineraryPlan.leadId !== leadId) {
      throw new BadRequestException("That flight event isn't on this booking's itinerary");
    }
  }

  private async loadBooking(bookingId: string, actor: Actor) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { quotation: { include: { lead: true } } },
    });
    if (!booking) throw new NotFoundException('Booking not found');
    if (actor.role === Role.TRAVEL_CONSULTANT && actor.id !== booking.quotation.consultantId) {
      throw new ForbiddenException('You can only act on your own bookings');
    }
    if (actor.role === Role.BRANCH_MANAGER && actor.branchId !== booking.quotation.lead.branchId) {
      throw new ForbiddenException("You can only act on your own branch's bookings");
    }
    return booking;
  }
}
