import { Injectable, NotFoundException } from '@nestjs/common';
import { ItineraryEventType } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { getPublicCompanyInfo } from '../common/company-info.util';

type Session = { travelerId: string; bookingId: string };

/**
 * Assembles everything the traveller PWA needs in ONE response.
 *
 * Deliberately a single aggregate rather than a set of granular endpoints:
 * the app has to work with no signal abroad, so it caches one payload on open
 * and reads from that cache offline. Several round-trips would mean several
 * ways to be half-cached.
 *
 * Every query is keyed off the session's bookingId — never an id from the
 * client — so a traveller can only ever read their own trip.
 */
@Injectable()
export class TravelerAppService {
  constructor(private readonly prisma: PrismaService) {}

  async getTrip(session: Session) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: session.bookingId },
      include: {
        quotation: {
          include: {
            lead: { include: { travelers: true } },
          },
        },
        transfers: { orderBy: { scheduledAt: 'asc' } },
      },
    });
    if (!booking) throw new NotFoundException('Trip not found');

    const traveler = booking.quotation.lead.travelers.find((t) => t.id === session.travelerId);

    // The itinerary lives on ItineraryPlan, which links to the Lead rather
    // than the Booking, so reach it through the lead and prefer a published
    // plan (what the client was actually sent) over an in-progress draft.
    const plans = await this.prisma.itineraryPlan.findMany({
      where: { leadId: booking.quotation.leadId },
      include: {
        days: { include: { events: { orderBy: { sortOrder: 'asc' } } }, orderBy: { dayNumber: 'asc' } },
        pricingOptions: { include: { accommodations: true }, orderBy: { sortOrder: 'asc' } },
        packageTerms: true,
      },
      orderBy: { updatedAt: 'desc' },
    });
    const plan = plans.find((p) => p.status === 'READY_TO_SHARE') ?? plans[0] ?? null;

    const destinations = plan?.destinations ?? [];
    const guides = destinations.length
      ? await this.prisma.countryGuide.findMany({
          where: { active: true, country: { in: destinations, mode: 'insensitive' } },
        })
      : [];

    const company = await getPublicCompanyInfo(this.prisma);

    return {
      traveler: traveler ? { id: traveler.id, name: traveler.name } : null,
      booking: {
        id: booking.id,
        status: booking.status,
        departureDate: booking.departureDate,
        returnDate: booking.returnDate,
        clientName: booking.quotation.lead.clientName,
      },
      itinerary: plan
        ? {
            refNo: plan.refNo,
            title: plan.title,
            destinations: plan.destinations,
            startDate: plan.startDate,
            endDate: plan.endDate,
            adultsCount: plan.adultsCount,
            childrenCount: plan.childrenCount,
            coverPhotoUrl: plan.coverPhotoUrl,
            days: plan.days.map((day) => ({
              id: day.id,
              dayNumber: day.dayNumber,
              date: day.date,
              events: day.events.map((e) => ({
                id: e.id,
                type: e.type,
                name: e.name,
                destination: e.destination,
                date: e.date,
                startTime: e.startTime,
                endTime: e.endTime,
                showTime: e.showTime,
                description: e.description,
                photoUrl: e.photoUrl,
                // Reuse the same public-safe detail shape the client report
                // uses — no netAmount/markupPct ever reaches the traveller.
                details: this.publicDetails(e.details),
              })),
            })),
            packageTerms: plan.packageTerms,
          }
        : null,
      hotels: plan
        ? plan.pricingOptions.flatMap((option) =>
            option.accommodations
              .filter((a) => a.type === ItineraryEventType.ACCOMMODATION)
              .map((a) => ({
                id: a.id,
                optionLabel: option.label,
                name: a.name,
                destination: a.destination,
                checkIn: a.date,
                checkOut: a.endDate,
                checkInTime: a.startTime,
                checkOutTime: a.endTime,
                photoUrl: a.photoUrl,
                description: a.description,
                details: this.publicDetails(a.details),
              })),
          )
        : [],
      transfers: booking.transfers.map((t) => ({
        id: t.id,
        type: t.type,
        scheduledAt: t.scheduledAt,
        fromLocation: t.fromLocation,
        toLocation: t.toLocation,
        driverName: t.driverName,
        driverPhone: t.driverPhone,
        vehicleNumber: t.vehicleNumber,
        vehicleType: t.vehicleType,
        notes: t.notes,
      })),
      countryGuides: guides.map((g) => ({
        country: g.country,
        emergencyPolice: g.emergencyPolice,
        emergencyMedical: g.emergencyMedical,
        embassyName: g.embassyName,
        embassyPhone: g.embassyPhone,
        embassyAddress: g.embassyAddress,
        cabServices: g.cabServices,
        restaurants: g.restaurants,
        notes: g.notes,
      })),
      support: {
        companyName: company.name,
        // The always-on number the traveller calls from anywhere, distinct
        // from the destination-local emergency services above.
        emergencyPhone: company.phone,
        email: company.email,
      },
      // Stamped so the PWA can show "last synced" when running from cache.
      syncedAt: new Date().toISOString(),
    };
  }

  private static readonly PUBLIC_DETAIL_KEYS = [
    'hotelCategory',
    'roomName',
    'mealPlan',
    'single',
    'double',
    'triple',
    'quad',
    'cwb',
    'cnb',
    'checkInTime',
    'checkOutTime',
    'flightNumber',
    'fromDestination',
    'toDestination',
    'durationMinutes',
    'mealType',
    'descriptionBullets',
  ] as const;

  private publicDetails(details: unknown): Record<string, unknown> | undefined {
    if (!details || typeof details !== 'object') return undefined;
    const source = details as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const key of TravelerAppService.PUBLIC_DETAIL_KEYS) {
      if (key in source) out[key] = source[key];
    }
    return Object.keys(out).length ? out : undefined;
  }
}
