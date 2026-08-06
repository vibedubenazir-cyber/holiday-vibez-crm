-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED');

-- AlterTable: convert status text column to the new enum, mapping existing values
ALTER TABLE "bookings" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "bookings" ALTER COLUMN "status" TYPE "BookingStatus" USING (
  CASE
    WHEN "status" IN ('PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED') THEN "status"::"BookingStatus"
    ELSE 'CONFIRMED'::"BookingStatus"
  END
);
ALTER TABLE "bookings" ALTER COLUMN "status" SET DEFAULT 'PENDING';
