import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { FlightStatusCode, Role, TripFlight } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateTripFlightDto, UpdateTripFlightDto } from './dto/trip-flight.dto';
import { fetchLiveFlightStatus, isFlightApiConfigured, LiveFlightStatus } from './flight-api.util';

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
    return this.persist(before, {
      ...data,
      ...(dto.scheduledDeparture ? { scheduledDeparture: new Date(dto.scheduledDeparture) } : {}),
      ...(dto.revisedDeparture ? { revisedDeparture: new Date(dto.revisedDeparture) } : {}),
    }, Boolean(notifyTraveller));
  }

  /**
   * Staff "refresh from live data" for one flight. Same persist path as a
   * manual edit, so a delay the API discovers notifies exactly like a delay a
   * consultant typed in.
   */
  async refreshFromApi(id: string, actor: Actor) {
    if (!isFlightApiConfigured()) {
      throw new BadRequestException('Flight data API is not configured yet (FLIGHT_API_KEY)');
    }
    const before = await this.prisma.tripFlight.findUnique({ where: { id } });
    if (!before) throw new NotFoundException('Flight not found');
    await this.loadBooking(before.bookingId, actor);

    const timezone = await this.resolveTimezone(before.eventId);
    const live = await fetchLiveFlightStatus(before.flightNumber, before.scheduledDeparture, timezone);
    if (!live) return before;
    return this.persist(before, this.livePatch(live));
  }

  /** The departure airport's IANA timezone, via the linked itinerary event's plan — null if unlinked. */
  private async resolveTimezone(eventId: string | null): Promise<string | null> {
    if (!eventId) return null;
    const event = await this.prisma.itineraryPlanEvent.findUnique({
      where: { id: eventId },
      select: { day: { select: { itineraryPlan: { select: { timezone: true } } } } },
    });
    return event?.day.itineraryPlan.timezone ?? null;
  }

  /**
   * Scheduled poll (see jobs.scheduler.ts 'flight-status-poll'): every flight
   * departing in the next 48 hours — or in the last 6, for gate/belt on
   * arrival — gets checked against the live feed, and any change flows through
   * the same notify path as a staff edit. A no-op until FLIGHT_API_KEY is set.
   */
  async pollLiveStatuses() {
    if (!isFlightApiConfigured()) return { polled: 0, updated: 0 };
    const now = Date.now();
    const candidates = await this.prisma.tripFlight.findMany({
      where: {
        status: { notIn: ['LANDED', 'CANCELLED'] },
        scheduledDeparture: { gte: new Date(now - 6 * 3600_000), lte: new Date(now + 48 * 3600_000) },
        booking: { status: { not: 'CANCELLED' } },
      },
      // Quota discipline: a run that somehow finds hundreds of flights should
      // spread them across runs rather than burn the plan in one poll.
      take: 25,
      orderBy: { scheduledDeparture: 'asc' },
    });

    const eventIds = [...new Set(candidates.map((f) => f.eventId).filter((id): id is string => id != null))];
    const events = eventIds.length
      ? await this.prisma.itineraryPlanEvent.findMany({
          where: { id: { in: eventIds } },
          select: { id: true, day: { select: { itineraryPlan: { select: { timezone: true } } } } },
        })
      : [];
    const timezoneByEventId = new Map(events.map((e) => [e.id, e.day.itineraryPlan.timezone]));

    let updated = 0;
    for (const flight of candidates) {
      const timezone = flight.eventId ? (timezoneByEventId.get(flight.eventId) ?? null) : null;
      const live = await fetchLiveFlightStatus(flight.flightNumber, flight.scheduledDeparture, timezone);
      if (!live) continue;
      const after = await this.persist(flight, this.livePatch(live));
      if (this.travellerVisibleChange(flight, after)) updated++;
    }
    return { polled: candidates.length, updated };
  }

  /**
   * Only patch the fields the feed actually reported — never blank a column
   * the feed is silent on. The one exception: if the flight recovers to a
   * non-delayed status, a `revisedDeparture` left over from an earlier delay
   * would contradict the new status ("is on time. New departure: ..."), so
   * clear it whenever the feed reports a status but no revised time.
   */
  private livePatch(live: LiveFlightStatus) {
    return {
      ...(live.status ? { status: live.status } : {}),
      ...(live.revisedDeparture
        ? { revisedDeparture: live.revisedDeparture }
        : live.status && live.status !== 'DELAYED'
          ? { revisedDeparture: null }
          : {}),
      ...(live.terminal ? { terminal: live.terminal } : {}),
      ...(live.gate ? { gate: live.gate } : {}),
      ...(live.baggageBelt ? { baggageBelt: live.baggageBelt } : {}),
    };
  }

  /**
   * The single write path: persist, diff, and notify only when something a
   * traveller would act on actually moved. Correcting an internal typo must
   * not buzz a phone at 3am in another timezone, but staff can force a send
   * when they want to restate the situation.
   */
  private async persist(
    before: TripFlight,
    data: Parameters<typeof this.prisma.tripFlight.update>[0]['data'],
    forceNotify = false,
  ) {
    const after = await this.prisma.tripFlight.update({ where: { id: before.id }, data });
    if (forceNotify || this.travellerVisibleChange(before, after)) {
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
    // matters to whoever is walking to the gate. And on both channels we hold:
    // WhatsApp reaches a phone on roaming, email survives a number that's
    // switched off with a travel SIM in the drawer.
    const recipients: { channel: 'WHATSAPP' | 'EMAIL'; to: string }[] = [];
    for (const traveller of lead.travelers) {
      if (traveller.phone) recipients.push({ channel: 'WHATSAPP', to: traveller.phone });
      if (traveller.email) recipients.push({ channel: 'EMAIL', to: traveller.email });
    }
    if (recipients.length === 0) {
      if (lead.phone) recipients.push({ channel: 'WHATSAPP', to: lead.phone });
      if (lead.email) recipients.push({ channel: 'EMAIL', to: lead.email });
    }
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

    for (const { channel, to } of recipients) {
      await this.notifications.send({
        channel,
        triggerType: 'trip_flight_update',
        recipient: to,
        // Not deduped: a flight can be delayed, moved, then delayed again, and
        // the traveller needs each one.
        relatedEntity: `trip_flight:${flight.id}`,
        subject: `Flight ${flight.flightNumber} ${STATUS_HEADLINE[flight.status]}`,
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
