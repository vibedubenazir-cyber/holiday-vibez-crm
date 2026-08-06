-- CreateEnum
CREATE TYPE "PaymentCategory" AS ENUM ('DMC', 'FLIGHT', 'HOTEL', 'ACTIVITY', 'OTHER');

-- AlterTable
ALTER TABLE "payments" ADD COLUMN     "category" "PaymentCategory";
