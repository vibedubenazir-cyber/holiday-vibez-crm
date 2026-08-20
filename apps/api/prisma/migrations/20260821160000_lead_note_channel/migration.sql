-- CreateEnum
CREATE TYPE "LeadNoteChannel" AS ENUM ('GENERAL', 'CALL', 'OTHER');

-- AlterTable
ALTER TABLE "lead_notes" ADD COLUMN     "channel" "LeadNoteChannel" NOT NULL DEFAULT 'GENERAL';
