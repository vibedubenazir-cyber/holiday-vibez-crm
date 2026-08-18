-- CreateEnum
CREATE TYPE "TravelerDocumentType" AS ENUM ('PASSPORT', 'VISA', 'FLIGHT_TICKET', 'HOTEL_VOUCHER', 'INSURANCE', 'ID_PROOF', 'OTHER');

-- CreateTable
CREATE TABLE "traveler_documents" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "travelerId" TEXT,
    "type" "TravelerDocumentType" NOT NULL,
    "label" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "uploadedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "traveler_documents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "traveler_documents_bookingId_idx" ON "traveler_documents"("bookingId");

-- CreateIndex
CREATE INDEX "traveler_documents_travelerId_idx" ON "traveler_documents"("travelerId");

-- AddForeignKey
ALTER TABLE "traveler_documents" ADD CONSTRAINT "traveler_documents_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "traveler_documents" ADD CONSTRAINT "traveler_documents_travelerId_fkey" FOREIGN KEY ("travelerId") REFERENCES "travelers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "traveler_documents" ADD CONSTRAINT "traveler_documents_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
