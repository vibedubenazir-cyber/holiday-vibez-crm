-- CreateEnum
CREATE TYPE "ExitType" AS ENUM ('RESIGNATION', 'TERMINATION');

-- CreateEnum
CREATE TYPE "ExitStatus" AS ENUM ('PENDING', 'CLEARED');

-- CreateEnum
CREATE TYPE "PerformanceRating" AS ENUM ('NEEDS_IMPROVEMENT', 'MEETS_EXPECTATIONS', 'EXCEEDS_EXPECTATIONS', 'OUTSTANDING');

-- CreateEnum
CREATE TYPE "PerformanceReviewStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'ACKNOWLEDGED');

-- CreateEnum
CREATE TYPE "ReimbursementCategory" AS ENUM ('TRAVEL', 'CLIENT_ENTERTAINMENT', 'SUPPLIES', 'OTHER');

-- CreateEnum
CREATE TYPE "ReimbursementStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'PAID');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "dateOfJoining" TIMESTAMP(3),
ADD COLUMN     "designation" TEXT,
ADD COLUMN     "emergencyContactName" TEXT,
ADD COLUMN     "emergencyContactPhone" TEXT,
ADD COLUMN     "employeeCode" TEXT,
ADD COLUMN     "profilePhotoUrl" TEXT,
ADD COLUMN     "reportsToId" TEXT;

-- CreateTable
CREATE TABLE "hr_exit_records" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "ExitType" NOT NULL,
    "noticeDate" TIMESTAMP(3) NOT NULL,
    "lastWorkingDate" TIMESTAMP(3) NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "ExitStatus" NOT NULL DEFAULT 'PENDING',
    "exitInterviewNotes" TEXT,
    "clearedById" TEXT,
    "clearedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hr_exit_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hr_performance_reviews" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "reviewerId" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "rating" "PerformanceRating",
    "strengths" TEXT,
    "improvements" TEXT,
    "goals" TEXT,
    "status" "PerformanceReviewStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hr_performance_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hr_reimbursement_claims" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "category" "ReimbursementCategory" NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "expenseDate" TIMESTAMP(3) NOT NULL,
    "receiptUrl" TEXT,
    "status" "ReimbursementStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewComment" TEXT,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hr_reimbursement_claims_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "hr_exit_records_userId_key" ON "hr_exit_records"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "hr_performance_reviews_userId_period_key" ON "hr_performance_reviews"("userId", "period");

-- CreateIndex
CREATE UNIQUE INDEX "users_employeeCode_key" ON "users"("employeeCode");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_reportsToId_fkey" FOREIGN KEY ("reportsToId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hr_exit_records" ADD CONSTRAINT "hr_exit_records_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hr_performance_reviews" ADD CONSTRAINT "hr_performance_reviews_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hr_performance_reviews" ADD CONSTRAINT "hr_performance_reviews_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hr_reimbursement_claims" ADD CONSTRAINT "hr_reimbursement_claims_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hr_reimbursement_claims" ADD CONSTRAINT "hr_reimbursement_claims_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

