-- CreateEnum
CREATE TYPE "ClientType" AS ENUM ('INDIVIDUAL', 'AGENT', 'CORPORATE', 'GROUP');

-- AlterEnum
ALTER TYPE "RateCardType" ADD VALUE 'TRANSFER';

-- AlterTable
ALTER TABLE "leads" ADD COLUMN     "clientId" TEXT;

-- CreateTable
CREATE TABLE "clients" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "ClientType" NOT NULL DEFAULT 'INDIVIDUAL',
    "phone" TEXT,
    "email" TEXT,
    "gstNumber" TEXT,
    "commissionPct" DECIMAL(5,2),
    "notes" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "clients_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;
