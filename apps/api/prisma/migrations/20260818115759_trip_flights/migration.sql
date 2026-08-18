-- CreateEnum
CREATE TYPE "FlightStatusCode" AS ENUM ('SCHEDULED', 'ON_TIME', 'DELAYED', 'BOARDING', 'DEPARTED', 'LANDED', 'CANCELLED');

-- CreateTable
CREATE TABLE "trip_flights" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "eventId" TEXT,
    "flightNumber" TEXT NOT NULL,
    "fromAirport" TEXT,
    "toAirport" TEXT,
    "scheduledDeparture" TIMESTAMP(3),
    "revisedDeparture" TIMESTAMP(3),
    "status" "FlightStatusCode" NOT NULL DEFAULT 'SCHEDULED',
    "terminal" TEXT,
    "gate" TEXT,
    "baggageBelt" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trip_flights_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "trip_flights_bookingId_idx" ON "trip_flights"("bookingId");

-- AddForeignKey
ALTER TABLE "trip_flights" ADD CONSTRAINT "trip_flights_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
