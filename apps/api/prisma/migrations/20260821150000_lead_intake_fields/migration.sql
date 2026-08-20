-- CreateEnum
CREATE TYPE "LeadService" AS ENUM ('FLIGHT', 'HOTEL', 'PACKAGE');

-- AlterTable
ALTER TABLE "leads" ADD COLUMN     "contactType" "ClientType" NOT NULL DEFAULT 'INDIVIDUAL',
ADD COLUMN     "infantsCount" INTEGER,
ADD COLUMN     "service" "LeadService",
ADD COLUMN     "title" TEXT,
ADD COLUMN     "travelEndDate" DATE;

