-- CreateTable
CREATE TABLE "lms_courses" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lms_courses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lms_lessons" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lms_lessons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lms_quiz_questions" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "options" TEXT[],
    "correctIndex" INTEGER NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lms_quiz_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lms_enrollments" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "enrolledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "lms_enrollments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lms_lesson_progress" (
    "id" TEXT NOT NULL,
    "enrollmentId" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lms_lesson_progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lms_quiz_attempts" (
    "id" TEXT NOT NULL,
    "enrollmentId" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "passed" BOOLEAN NOT NULL,
    "attemptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lms_quiz_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lms_certificates" (
    "id" TEXT NOT NULL,
    "enrollmentId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "certNo" TEXT NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lms_certificates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "lms_enrollments_courseId_userId_key" ON "lms_enrollments"("courseId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "lms_lesson_progress_enrollmentId_lessonId_key" ON "lms_lesson_progress"("enrollmentId", "lessonId");

-- CreateIndex
CREATE UNIQUE INDEX "lms_certificates_enrollmentId_key" ON "lms_certificates"("enrollmentId");

-- CreateIndex
CREATE UNIQUE INDEX "lms_certificates_certNo_key" ON "lms_certificates"("certNo");

-- AddForeignKey
ALTER TABLE "lms_lessons" ADD CONSTRAINT "lms_lessons_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "lms_courses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lms_quiz_questions" ADD CONSTRAINT "lms_quiz_questions_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "lms_courses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lms_enrollments" ADD CONSTRAINT "lms_enrollments_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "lms_courses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lms_enrollments" ADD CONSTRAINT "lms_enrollments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lms_lesson_progress" ADD CONSTRAINT "lms_lesson_progress_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "lms_enrollments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lms_lesson_progress" ADD CONSTRAINT "lms_lesson_progress_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "lms_lessons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lms_quiz_attempts" ADD CONSTRAINT "lms_quiz_attempts_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "lms_enrollments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lms_certificates" ADD CONSTRAINT "lms_certificates_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "lms_enrollments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
