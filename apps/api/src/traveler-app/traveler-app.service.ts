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
        flights: { orderBy: [{ scheduledDeparture: 'asc' }, { createdAt: 'asc' }] },
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

    // The same messages that went out on WhatsApp/email, surfaced inside the
    // app — so "check the app" is always true even if a message was missed.
    // Sourced from the Notification log rather than a new table: one write
    // path, and the app shows exactly what was sent, not a paraphrase.
    const updateEntities = [
      ...booking.flights.map((f) => `trip_flight:${f.id}`),
      ...booking.transfers.map((t) => `trip_transfer:${t.id}`),
    ];
    const rawUpdates = await this.prisma.notification.findMany({
      where: {
        OR: [
          ...(updateEntities.length ? [{ relatedEntity: { in: updateEntities } }] : []),
          { relatedEntity: { startsWith: `booking:${booking.id}:countdown:` } },
        ],
        body: { not: null },
      },
      orderBy: { createdAt: 'desc' },
      take: 60,
    });
    // One notification event fans out to several recipients (rows). Collapse
    // to one entry per (trigger, cleaned body) — the recipient-specific
    // relatedEntity would show the same countdown once per phone number, and
    // must never leak contact details to whoever is signed in.
    // Every outbound message ends with an "open your trip app" line; inside
    // the app that line is noise, so drop lines carrying the app URL — but
    // only URL-bearing lines, and if that somehow eats the whole message,
    // show it with the bare URL excised rather than losing it.
    // Countdown messages are personalised per recipient ("Hi, Priya!"), and
    // relatedEntity ends with that recipient. Keep one row per milestone,
    // preferring the copy addressed to whoever is signed in — falling back to
    // the newest row when none matches (lead-contact fallback sends).
    const countdownByMilestone = new Map<string, (typeof rawUpdates)[number] & { addressedToMe?: boolean }>();
    const otherRows: typeof rawUpdates = [];
    for (const row of rawUpdates) {
      const entity = row.relatedEntity ?? '';
      if (!entity.includes(':countdown:')) {
        otherRows.push(row);
        continue;
      }
      const milestone = entity.slice(0, entity.lastIndexOf(':'));
      const to = entity.slice(entity.lastIndexOf(':') + 1);
      const addressedToMe = traveler != null && (to === traveler.phone || to === traveler.email);
      const existing = countdownByMilestone.get(milestone);
      if (!existing || addressedToMe) {
        // No row is addressed to a traveller with neither phone nor email on
        // file (e.g. a companion added without contact details) — the best
        // available fallback is still another traveller's row, so genericise
        // its "Hi, <name>!" greeting rather than showing someone else's name.
        countdownByMilestone.set(milestone, { ...row, addressedToMe });
      }
    }
    const feedRows = [...countdownByMilestone.values(), ...otherRows].sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
    );

    const appLink = /https?:\/\/\S*\/trip\b/;
    const seenUpdates = new Set<string>();
    const updates: { id: string; triggerType: string; body: string; createdAt: Date }[] = [];
    for (const row of feedRows as ((typeof rawUpdates)[number] & { addressedToMe?: boolean })[]) {
      let body = (row.body ?? '')
        .split('\n')
        .filter((line) => !appLink.test(line))
        .join('\n')
        .trim();
      if (!body) {
        body = (row.body ?? '')
          .replace(/https?:\/\/\S*\/trip\S*/g, '')
          .replace(/[\s:]+$/, '')
          .trim();
      }
      if (!body) continue;
      // Fallback countdown row addressed to a different traveller on the same
      // booking (see countdownByMilestone above) — strip their name so it
      // never appears on a companion's screen.
      if (row.addressedToMe === false) {
        body = body.replace(/^Hi,\s*[^!\n]+!/, 'Hi!');
      }
      const key = `${row.triggerType}|${body}`;
      if (seenUpdates.has(key)) continue;
      seenUpdates.add(key);
      updates.push({ id: row.id, triggerType: row.triggerType, body, createdAt: row.createdAt });
      if (updates.length >= 20) break;
    }

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
            timezone: plan.timezone,
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
      flights: booking.flights.map((f) => ({
        id: f.id,
        eventId: f.eventId,
        flightNumber: f.flightNumber,
        fromAirport: f.fromAirport,
        toAirport: f.toAirport,
        scheduledDeparture: f.scheduledDeparture,
        revisedDeparture: f.revisedDeparture,
        status: f.status,
        terminal: f.terminal,
        gate: f.gate,
        baggageBelt: f.baggageBelt,
        note: f.note,
        updatedAt: f.updatedAt,
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
      updates,
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
