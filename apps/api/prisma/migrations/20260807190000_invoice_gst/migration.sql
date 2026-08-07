-- AlterTable
ALTER TABLE "invoices" ADD COLUMN "gstRate" DECIMAL(5,2) NOT NULL DEFAULT 0,
ADD COLUMN "customerGstin" TEXT;
