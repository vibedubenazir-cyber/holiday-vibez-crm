-- CreateEnum
CREATE TYPE "AssignmentScope" AS ENUM ('CONSULTANT', 'BRANCH', 'ROLE');

-- AlterTable
ALTER TABLE "lms_enrollments" ADD COLUMN     "assignedById" TEXT,
ADD COLUMN     "dueDate" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "lms_course_assignments" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "scope" "AssignmentScope" NOT NULL,
    "scopeId" TEXT NOT NULL,
    "dueDate" TIMESTAMP(3),
    "assignedBy" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,

    CONSTRAINT "lms_course_assignments_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "lms_course_assignments" ADD CONSTRAINT "lms_course_assignments_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "lms_courses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
