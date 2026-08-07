-- CreateEnum
CREATE TYPE "LeadTemperature" AS ENUM ('HOT', 'WARM', 'COLD');

-- AlterTable
ALTER TABLE "leads" ADD COLUMN "temperature" "LeadTemperature" NOT NULL DEFAULT 'WARM';
