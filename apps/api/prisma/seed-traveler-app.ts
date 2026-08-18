// Idempotent seeder for the traveller companion app (/trip) demo data:
// the airport transfers and the per-destination country guides.
//
// The transfer times are DERIVED from the itinerary's own arrival and
// departure flights rather than typed in. They were hand-entered originally
// and drifted two months away from the trip they belonged to, which is
// exactly the kind of silent inconsistency a derived value can't produce.
import { PrismaClient, TripTransferType } from '@prisma/client';

const prisma = new PrismaClient();

/** IANA zone the demo trip's destinations sit in; stored on the plan so the
 *  traveller app can render every time on the destination's clock. */
const DESTINATION_TIMEZONE = 'Asia/Bangkok';
/** Thailand is UTC+7 year-round (no DST), so a fixed offset is safe here. */
const DESTINATION_UTC_OFFSET_HOURS = 7;

/** Minutes after the inbound flight lands that the driver meets the traveller. */
const PICKUP_AFTER_LANDING_MINUTES = 40;
/** Minutes before the outbound flight that the departure drop leaves the hotel. */
const DROP_BEFORE_DEPARTURE_MINUTES = 180;

/**
 * Turns a trip date plus a local "HH:MM" wall time at the destination into the
 * absolute instant TripTransfer.scheduledAt stores. Reading the calendar date
 * off the ISO string rather than via getDate() matters because Prisma
 * serialises a @db.Date as UTC midnight.
 */
function destinationLocalToInstant(date: Date, clock: string, shiftMinutes: number): Date {
  const day = date.toISOString().slice(0, 10);
  const [hours, minutes] = clock.split(':').map(Number);
  const utc = Date.UTC(
    Number(day.slice(0, 4)),
    Number(day.slice(5, 7)) - 1,
    Number(day.slice(8, 10)),
    hours - DESTINATION_UTC_OFFSET_HOURS,
    minutes,
  );
  return new Date(utc + shiftMinutes * 60_000);
}

async function main() {
  const plan = await prisma.itineraryPlan.findFirstOrThrow({
    where: { title: { contains: 'Thailand' } },
    include: {
      days: {
        orderBy: { dayNumber: 'asc' },
        include: { events: { where: { type: 'FLIGHT' }, orderBy: { sortOrder: 'asc' } } },
      },
    },
  });

  const flights = plan.days.flatMap((day) => day.events.map((event) => ({ day, event })));
  if (flights.length < 2) throw new Error('Expected an arrival and a departure flight on the demo itinerary.');

  const arrival = flights[0];
  const departure = flights[flights.length - 1];

  // The pickup keys off when the inbound flight LANDS (its end time), the drop
  // off when the outbound flight DEPARTS (its start time).
  const arrivalLands = arrival.event.endTime ?? arrival.event.startTime;
  const departureLeaves = departure.event.startTime;
  if (!arrivalLands || !departureLeaves) throw new Error('Demo flights are missing their times.');

  const pickupAt = destinationLocalToInstant(
    arrival.event.date ?? arrival.day.date!,
    arrivalLands,
    PICKUP_AFTER_LANDING_MINUTES,
  );
  const dropAt = destinationLocalToInstant(
    departure.event.date ?? departure.day.date!,
    departureLeaves,
    -DROP_BEFORE_DEPARTURE_MINUTES,
  );

  await prisma.itineraryPlan.update({
    where: { id: plan.id },
    data: { timezone: DESTINATION_TIMEZONE },
  });

  const booking = await prisma.booking.findFirstOrThrow({
    where: { transfers: { some: {} } },
    include: { transfers: true },
  });

  // The booking's own dates are realigned to the itinerary too — they were
  // seeded independently and had drifted to a different month again.
  await prisma.booking.update({
    where: { id: booking.id },
    data: { departureDate: plan.startDate!, returnDate: plan.endDate },
  });

  const updates: { type: TripTransferType; at: Date }[] = [
    { type: 'ARRIVAL_PICKUP', at: pickupAt },
    { type: 'DEPARTURE_DROP', at: dropAt },
  ];

  for (const { type, at } of updates) {
    const existing = booking.transfers.find((t) => t.type === type);
    if (!existing) {
      console.log(`No ${type} transfer on booking ${booking.id} — skipping.`);
      continue;
    }
    await prisma.tripTransfer.update({ where: { id: existing.id }, data: { scheduledAt: at } });
    console.log(`${type} → ${at.toISOString()} (${at.toISOString().slice(11, 16)} UTC)`);
  }

  console.log(`Booking ${booking.id} realigned to ${plan.startDate?.toISOString().slice(0, 10)}.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
