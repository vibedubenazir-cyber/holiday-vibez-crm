-- CreateEnum
CREATE TYPE "TripTransferType" AS ENUM ('ARRIVAL_PICKUP', 'DEPARTURE_DROP', 'INTERCITY', 'DAY_TRANSFER');

-- CreateTable
CREATE TABLE "traveler_otps" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "traveler_otps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "traveler_sessions" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "travelerId" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "traveler_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trip_transfers" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "type" "TripTransferType" NOT NULL,
    "scheduledAt" TIMESTAMP(3),
    "fromLocation" TEXT,
    "toLocation" TEXT,
    "driverName" TEXT,
    "driverPhone" TEXT,
    "vehicleNumber" TEXT,
    "vehicleType" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trip_transfers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "country_guides" (
    "id" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "emergencyPolice" TEXT,
    "emergencyMedical" TEXT,
    "embassyName" TEXT,
    "embassyPhone" TEXT,
    "embassyAddress" TEXT,
    "cabServices" JSONB,
    "restaurants" JSONB,
    "notes" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "country_guides_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "traveler_otps_identifier_expiresAt_idx" ON "traveler_otps"("identifier", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "traveler_sessions_tokenHash_key" ON "traveler_sessions"("tokenHash");

-- CreateIndex
CREATE INDEX "traveler_sessions_travelerId_idx" ON "traveler_sessions"("travelerId");

-- CreateIndex
CREATE INDEX "trip_transfers_bookingId_idx" ON "trip_transfers"("bookingId");

-- CreateIndex
CREATE UNIQUE INDEX "country_guides_country_key" ON "country_guides"("country");

-- AddForeignKey
ALTER TABLE "traveler_sessions" ADD CONSTRAINT "traveler_sessions_travelerId_fkey" FOREIGN KEY ("travelerId") REFERENCES "travelers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "traveler_sessions" ADD CONSTRAINT "traveler_sessions_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_transfers" ADD CONSTRAINT "trip_transfers_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
