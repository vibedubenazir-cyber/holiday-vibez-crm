// One-off idempotent runner for the destination courses — safe to run
// against an already-seeded database (skips any course whose title already
// exists). The fresh-DB path (prisma/seed.ts) uses the same course data.
import { PrismaClient } from '@prisma/client';
import { DESTINATION_COURSES } from './lms-destination-courses';

const prisma = new PrismaClient();

async function main() {
  const director = await prisma.user.findFirstOrThrow({ where: { email: 'director@holidayvibez.com' } });

  for (const course of DESTINATION_COURSES) {
    const existing = await prisma.course.findFirst({ where: { title: course.title } });
    if (existing) {
      console.log(`Skipping "${course.title}" — already exists.`);
      continue;
    }
    await prisma.course.create({
      data: {
        title: course.title,
        description: course.description,
        category: course.category,
        imageUrl: course.imageUrl,
        createdBy: director.id,
        lessons: { createMany: { data: course.lessons.map((l, i) => ({ title: l.title, content: l.content, order: i })) } },
        quizQuestions: {
          createMany: { data: course.quiz.map((q, i) => ({ text: q.text, options: q.options, correctIndex: q.correctIndex, order: i })) },
        },
      },
    });
    console.log(`Created "${course.title}" with ${course.lessons.length} lessons and ${course.quiz.length} quiz questions.`);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
