-- CreateEnum
CREATE TYPE "HrTicketCategory" AS ENUM ('IT_ACCESS', 'PAYROLL_QUERY', 'BENEFITS', 'WORKPLACE', 'OTHER');

-- CreateEnum
CREATE TYPE "GrievanceCategory" AS ENUM ('GENERAL_GRIEVANCE', 'POSH_COMPLAINT');

-- CreateEnum
CREATE TYPE "GrievanceStatus" AS ENUM ('SUBMITTED', 'UNDER_REVIEW', 'RESOLVED');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "probationEndDate" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "hr_settings" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hr_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hr_tickets" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "category" "HrTicketCategory" NOT NULL,
    "subject" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "priority" "TicketPriority" NOT NULL DEFAULT 'MEDIUM',
    "status" "TicketStatus" NOT NULL DEFAULT 'OPEN',
    "assignedToId" TEXT,
    "resolutionNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hr_tickets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hr_grievance_reports" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "category" "GrievanceCategory" NOT NULL,
    "description" TEXT NOT NULL,
    "against" TEXT,
    "status" "GrievanceStatus" NOT NULL DEFAULT 'SUBMITTED',
    "resolutionNotes" TEXT,
    "handledById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hr_grievance_reports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "hr_settings_key_key" ON "hr_settings"("key");

-- AddForeignKey
ALTER TABLE "hr_tickets" ADD CONSTRAINT "hr_tickets_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hr_tickets" ADD CONSTRAINT "hr_tickets_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hr_grievance_reports" ADD CONSTRAINT "hr_grievance_reports_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hr_grievance_reports" ADD CONSTRAINT "hr_grievance_reports_handledById_fkey" FOREIGN KEY ("handledById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

