-- gen_random_uuid() is core in PG13+, but ensure pgcrypto for the backfill.
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- CreateTable
CREATE TABLE "lms_chapters" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lms_chapters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lms_self_assessment_questions" (
    "id" TEXT NOT NULL,
    "chapterId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "options" TEXT[],
    "correctIndex" INTEGER NOT NULL,
    "explanation" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lms_self_assessment_questions_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "lms_lessons" ADD COLUMN "chapterId" TEXT;

-- AddForeignKey
ALTER TABLE "lms_chapters" ADD CONSTRAINT "lms_chapters_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "lms_courses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lms_self_assessment_questions" ADD CONSTRAINT "lms_self_assessment_questions_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "lms_chapters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lms_lessons" ADD CONSTRAINT "lms_lessons_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "lms_chapters"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill: give every course that has lessons a default "Chapter 1",
-- then move all of that course's lessons into it.
INSERT INTO "lms_chapters" ("id", "courseId", "title", "order", "createdAt")
SELECT gen_random_uuid(), c."id", 'Chapter 1', 0, CURRENT_TIMESTAMP
FROM "lms_courses" c
WHERE EXISTS (SELECT 1 FROM "lms_lessons" l WHERE l."courseId" = c."id");

UPDATE "lms_lessons" l
SET "chapterId" = ch."id"
FROM "lms_chapters" ch
WHERE ch."courseId" = l."courseId" AND l."chapterId" IS NULL;
