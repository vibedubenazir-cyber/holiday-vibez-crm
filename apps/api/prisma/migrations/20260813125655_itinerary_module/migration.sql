-- CreateEnum
CREATE TYPE "RoomCategory" AS ENUM ('SINGLE', 'DOUBLE', 'TRIPLE', 'QUAD', 'CWB', 'CNB');

-- CreateEnum
CREATE TYPE "TransportationType" AS ENUM ('PRIVATE', 'SIC');

-- CreateEnum
CREATE TYPE "ItineraryNoteType" AS ENUM ('VISA', 'MEAL', 'FLIGHT', 'LEISURE', 'CRUISE');

-- CreateTable
CREATE TABLE "itineraries" (
    "id" TEXT NOT NULL,
    "quotationId" TEXT NOT NULL,
    "bookingPaymentTerms" TEXT,
    "pricingTerms" TEXT,
    "inclusionsExclusions" TEXT,
    "cancellationRefundPolicy" TEXT,
    "importantInstructions" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "itineraries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "itinerary_days" (
    "id" TEXT NOT NULL,
    "itineraryId" TEXT NOT NULL,
    "dayNumber" INTEGER NOT NULL,
    "date" DATE,
    "title" TEXT,

    CONSTRAINT "itinerary_days_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "itinerary_accommodations" (
    "id" TEXT NOT NULL,
    "dayId" TEXT NOT NULL,
    "hotelName" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "checkInDate" DATE NOT NULL,
    "checkOutDate" DATE NOT NULL,
    "nights" INTEGER NOT NULL,
    "roomCategory" "RoomCategory" NOT NULL,
    "numberOfRooms" INTEGER NOT NULL,
    "checkInTime" TEXT,
    "checkOutTime" TEXT,
    "description" TEXT,

    CONSTRAINT "itinerary_accommodations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "itinerary_activities" (
    "id" TEXT NOT NULL,
    "dayId" TEXT NOT NULL,
    "destination" TEXT NOT NULL,
    "activityName" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "itinerary_activities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "itinerary_transportations" (
    "id" TEXT NOT NULL,
    "dayId" TEXT NOT NULL,
    "type" "TransportationType" NOT NULL,
    "description" TEXT,

    CONSTRAINT "itinerary_transportations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "itinerary_notes" (
    "id" TEXT NOT NULL,
    "dayId" TEXT NOT NULL,
    "type" "ItineraryNoteType" NOT NULL,
    "description" TEXT,

    CONSTRAINT "itinerary_notes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "itineraries_quotationId_key" ON "itineraries"("quotationId");

-- CreateIndex
CREATE UNIQUE INDEX "itinerary_days_itineraryId_dayNumber_key" ON "itinerary_days"("itineraryId", "dayNumber");

-- AddForeignKey
ALTER TABLE "itineraries" ADD CONSTRAINT "itineraries_quotationId_fkey" FOREIGN KEY ("quotationId") REFERENCES "quotations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "itinerary_days" ADD CONSTRAINT "itinerary_days_itineraryId_fkey" FOREIGN KEY ("itineraryId") REFERENCES "itineraries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "itinerary_accommodations" ADD CONSTRAINT "itinerary_accommodations_dayId_fkey" FOREIGN KEY ("dayId") REFERENCES "itinerary_days"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "itinerary_activities" ADD CONSTRAINT "itinerary_activities_dayId_fkey" FOREIGN KEY ("dayId") REFERENCES "itinerary_days"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "itinerary_transportations" ADD CONSTRAINT "itinerary_transportations_dayId_fkey" FOREIGN KEY ("dayId") REFERENCES "itinerary_days"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "itinerary_notes" ADD CONSTRAINT "itinerary_notes_dayId_fkey" FOREIGN KEY ("dayId") REFERENCES "itinerary_days"("id") ON DELETE CASCADE ON UPDATE CASCADE;

