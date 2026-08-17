-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "LeadSource" ADD VALUE 'INSTAGRAM';
ALTER TYPE "LeadSource" ADD VALUE 'FACEBOOK';
ALTER TYPE "LeadSource" ADD VALUE 'EXISTING_CUSTOMER';
ALTER TYPE "LeadSource" ADD VALUE 'AGENT_B2B';
ALTER TYPE "LeadSource" ADD VALUE 'PHONE_CALL';

-- AlterTable
ALTER TABLE "leads" ADD COLUMN     "adultsCount" INTEGER,
ADD COLUMN     "childrenAges" TEXT,
ADD COLUMN     "childrenCount" INTEGER,
ADD COLUMN     "flightRequired" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "hotelCategory" INTEGER,
ADD COLUMN     "insuranceRequired" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "mealPreference" TEXT,
ADD COLUMN     "transportRequired" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "travelDate" DATE,
ADD COLUMN     "visaRequired" BOOLEAN NOT NULL DEFAULT false;

