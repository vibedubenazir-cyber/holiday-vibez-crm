import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateCourseDto, CreateLessonDto, CreateQuizQuestionDto, SubmitQuizDto, UpdateCourseDto } from './dto/course.dto';

const PASS_THRESHOLD = 0.7;

@Injectable()
export class LmsService {
  constructor(private readonly prisma: PrismaService) {}

  async listCourses(includeInactive: boolean) {
    const courses = await this.prisma.course.findMany({
      where: includeInactive ? undefined : { active: true },
      include: { lessons: { select: { id: true } }, quizQuestions: { select: { id: true } }, enrollments: { select: { id: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return courses.map((c) => ({
      id: c.id,
      title: c.title,
      description: c.description,
      category: c.category,
      active: c.active,
      createdBy: c.createdBy,
      createdAt: c.createdAt,
      lessonCount: c.lessons.length,
      hasQuiz: c.quizQuestions.length > 0,
      enrollmentCount: c.enrollments.length,
    }));
  }

  async createCourse(dto: CreateCourseDto, createdBy: string) {
    return this.prisma.course.create({ data: { title: dto.title, description: dto.description, category: dto.category, createdBy } });
  }

  async updateCourse(courseId: string, dto: UpdateCourseDto) {
    await this.requireCourse(courseId);
    return this.prisma.course.update({ where: { id: courseId }, data: dto });
  }

  async addLesson(courseId: string, dto: CreateLessonDto) {
    await this.requireCourse(courseId);
    return this.prisma.lesson.create({ data: { courseId, title: dto.title, content: dto.content, order: dto.order ?? 0 } });
  }

  async addQuizQuestion(courseId: string, dto: CreateQuizQuestionDto) {
    await this.requireCourse(courseId);
    if (dto.correctIndex < 0 || dto.correctIndex >= dto.options.length) {
      throw new BadRequestException('correctIndex must reference one of the provided options');
    }
    return this.prisma.quizQuestion.create({
      data: { courseId, text: dto.text, options: dto.options, correctIndex: dto.correctIndex, order: dto.order ?? 0 },
    });
  }

  async getCourseDetail(courseId: string, userId: string, isManager: boolean) {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      include: {
        lessons: { orderBy: { order: 'asc' } },
        quizQuestions: { orderBy: { order: 'asc' } },
      },
    });
    if (!course) throw new NotFoundException('Course not found');

    const enrollment = await this.prisma.enrollment.findUnique({
      where: { courseId_userId: { courseId, userId } },
      include: { progress: true, attempts: { orderBy: { attemptedAt: 'desc' } }, certificate: true },
    });

    // Deactivated courses are hidden from the catalog (listCourses) for
    // non-managers — this closes the gap where the direct-by-id route didn't
    // enforce the same rule. Already-enrolled learners can still see their
    // own progress/certificate on a course that's since been deactivated.
    if (!course.active && !isManager && !enrollment) {
      throw new NotFoundException('Course not found');
    }

    return {
      id: course.id,
      title: course.title,
      description: course.description,
      category: course.category,
      active: course.active,
      lessons: course.lessons,
      // Never leak the answer key to non-managers — front-end quiz form only needs text+options.
      quizQuestions: course.quizQuestions.map((q) => ({
        id: q.id,
        text: q.text,
        options: q.options,
        order: q.order,
        ...(isManager ? { correctIndex: q.correctIndex } : {}),
      })),
      enrolled: !!enrollment,
      completedLessonIds: enrollment?.progress.map((p) => p.lessonId) ?? [],
      completedAt: enrollment?.completedAt ?? null,
      latestAttempt: enrollment?.attempts[0] ?? null,
      certificate: enrollment?.certificate ?? null,
    };
  }

  async enroll(courseId: string, userId: string) {
    const course = await this.requireCourse(courseId);
    const existing = await this.prisma.enrollment.findUnique({ where: { courseId_userId: { courseId, userId } } });
    if (existing) return existing;
    if (!course.active) throw new NotFoundException('Course not found');
    return this.prisma.enrollment.create({ data: { courseId, userId } });
  }

  async markLessonComplete(courseId: string, lessonId: string, userId: string) {
    const enrollment = await this.requireEnrollment(courseId, userId);
    const lesson = await this.prisma.lesson.findUnique({ where: { id: lessonId } });
    if (!lesson || lesson.courseId !== courseId) throw new NotFoundException('Lesson not found on this course');

    await this.prisma.lessonProgress.upsert({
      where: { enrollmentId_lessonId: { enrollmentId: enrollment.id, lessonId } },
      create: { enrollmentId: enrollment.id, lessonId },
      update: {},
    });

    await this.maybeCompleteEnrollment(enrollment.id, courseId);
    return this.prisma.enrollment.findUnique({ where: { id: enrollment.id }, include: { progress: true } });
  }

  async submitQuiz(courseId: string, userId: string, dto: SubmitQuizDto) {
    const enrollment = await this.requireEnrollment(courseId, userId);
    const questions = await this.prisma.quizQuestion.findMany({ where: { courseId } });
    if (questions.length === 0) throw new BadRequestException('This course has no quiz');

    let correct = 0;
    for (const q of questions) {
      const answer = dto.answers.find((a) => a.questionId === q.id);
      if (answer && answer.selectedIndex === q.correctIndex) correct++;
    }
    const score = Math.round((correct / questions.length) * 100);
    const passed = correct / questions.length >= PASS_THRESHOLD;

    const attempt = await this.prisma.quizAttempt.create({ data: { enrollmentId: enrollment.id, score, passed } });
    if (passed) await this.maybeCompleteEnrollment(enrollment.id, courseId);
    return attempt;
  }

  async myLearning(userId: string) {
    const enrollments = await this.prisma.enrollment.findMany({
      where: { userId },
      include: { course: { include: { lessons: { select: { id: true } } } }, progress: true, certificate: true },
      orderBy: { enrolledAt: 'desc' },
    });
    return enrollments.map((e) => ({
      enrollmentId: e.id,
      courseId: e.courseId,
      title: e.course.title,
      category: e.course.category,
      enrolledAt: e.enrolledAt,
      completedAt: e.completedAt,
      totalLessons: e.course.lessons.length,
      completedLessons: e.progress.length,
      certificate: e.certificate,
    }));
  }

  async myCertificates(userId: string) {
    const certs = await this.prisma.certificate.findMany({
      where: { userId },
      include: { enrollment: { include: { course: true } } },
      orderBy: { issuedAt: 'desc' },
    });
    return certs.map((c) => ({
      id: c.id,
      certNo: c.certNo,
      issuedAt: c.issuedAt,
      courseId: c.courseId,
      courseTitle: c.enrollment.course.title,
    }));
  }

  private async maybeCompleteEnrollment(enrollmentId: string, courseId: string) {
    const [enrollment, course] = await Promise.all([
      this.prisma.enrollment.findUnique({ where: { id: enrollmentId }, include: { progress: true, attempts: true } }),
      this.prisma.course.findUnique({ where: { id: courseId }, include: { lessons: true, quizQuestions: true } }),
    ]);
    if (!enrollment || !course || enrollment.completedAt) return;

    const allLessonsDone = course.lessons.every((l) => enrollment.progress.some((p) => p.lessonId === l.id));
    if (!allLessonsDone) return;

    const quizOk = course.quizQuestions.length === 0 || enrollment.attempts.some((a) => a.passed);
    if (!quizOk) return;

    await this.prisma.enrollment.update({ where: { id: enrollmentId }, data: { completedAt: new Date() } });
    const certNo = `CERT-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;
    await this.prisma.certificate.create({
      data: { enrollmentId, courseId, userId: enrollment.userId, certNo },
    });
  }

  private async requireCourse(courseId: string) {
    const course = await this.prisma.course.findUnique({ where: { id: courseId } });
    if (!course) throw new NotFoundException('Course not found');
    return course;
  }

  private async requireEnrollment(courseId: string, userId: string) {
    const enrollment = await this.prisma.enrollment.findUnique({ where: { courseId_userId: { courseId, userId } } });
    if (!enrollment) throw new ForbiddenException('Enroll in this course first');
    return enrollment;
  }
}
