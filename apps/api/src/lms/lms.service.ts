import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { AssignmentScope, Role } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { resolveBranchScope } from '../common/branch-scope.util';
import { CreateCourseDto, CreateLessonDto, CreateQuizQuestionDto, SubmitQuizDto, UpdateCourseDto } from './dto/course.dto';
import { CreateAssignmentDto } from './dto/assignment.dto';

const PASS_THRESHOLD = 0.7;
type ActingUser = { id: string; role: Role; branchId: string | null };

@Injectable()
export class LmsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

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
      imageUrl: c.imageUrl,
      active: c.active,
      createdBy: c.createdBy,
      createdAt: c.createdAt,
      lessonCount: c.lessons.length,
      hasQuiz: c.quizQuestions.length > 0,
      enrollmentCount: c.enrollments.length,
    }));
  }

  async createCourse(dto: CreateCourseDto, createdBy: string) {
    return this.prisma.course.create({
      data: { title: dto.title, description: dto.description, category: dto.category, imageUrl: dto.imageUrl, createdBy },
    });
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
      imageUrl: course.imageUrl,
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
      dueDate: enrollment?.dueDate ?? null,
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
      imageUrl: e.course.imageUrl,
      enrolledAt: e.enrolledAt,
      completedAt: e.completedAt,
      dueDate: e.dueDate,
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

  async createAssignment(dto: CreateAssignmentDto, assignedBy: string, actingUser: ActingUser) {
    const course = await this.requireCourse(dto.courseId);

    // Branch Managers may only assign within their own branch — no org-wide
    // ROLE assignments, and a CONSULTANT/BRANCH target must resolve inside
    // their branch. Mirrors how Targets restricts Branch Manager scope.
    if (actingUser.role === Role.BRANCH_MANAGER) {
      if (dto.scope === AssignmentScope.ROLE) {
        throw new ForbiddenException('Branch managers cannot assign training by role');
      }
      if (dto.scope === AssignmentScope.BRANCH && dto.scopeId !== actingUser.branchId) {
        throw new ForbiddenException('Branch managers can only assign training to their own branch');
      }
    }

    const userIds = await this.resolveScopeUserIds(dto.scope, dto.scopeId);

    if (actingUser.role === Role.BRANCH_MANAGER && dto.scope === AssignmentScope.CONSULTANT) {
      const target = await this.prisma.user.findUnique({ where: { id: dto.scopeId } });
      if (!target || target.branchId !== actingUser.branchId) {
        throw new ForbiddenException('Branch managers can only assign training to consultants in their own branch');
      }
    }

    if (userIds.length === 0) {
      throw new BadRequestException('No users matched this assignment scope');
    }

    const dueDate = dto.dueDate ? new Date(dto.dueDate) : null;

    const assignment = await this.prisma.courseAssignment.create({
      data: {
        courseId: dto.courseId,
        scope: dto.scope,
        scopeId: dto.scopeId,
        dueDate,
        assignedBy,
        notes: dto.notes,
      },
    });

    await Promise.all(
      userIds.map((userId) =>
        this.prisma.enrollment.upsert({
          where: { courseId_userId: { courseId: dto.courseId, userId } },
          create: { courseId: dto.courseId, userId, dueDate, assignedById: assignedBy },
          update: dueDate ? { dueDate, assignedById: assignedBy } : { assignedById: assignedBy },
        }),
      ),
    );

    await Promise.all(
      userIds.map((userId) =>
        this.notifications.send({
          channel: 'PUSH',
          triggerType: 'course_assigned',
          recipient: userId,
          relatedEntity: `course:${dto.courseId}`,
          subject: 'New training assigned',
          body: dueDate
            ? `You've been assigned "${course.title}" — due ${dueDate.toDateString()}`
            : `You've been assigned "${course.title}"`,
        }),
      ),
    );

    return assignment;
  }

  private async resolveScopeUserIds(scope: AssignmentScope, scopeId: string): Promise<string[]> {
    if (scope === AssignmentScope.CONSULTANT) {
      const user = await this.prisma.user.findUnique({ where: { id: scopeId } });
      if (!user || user.status !== 'ACTIVE') return [];
      return [user.id];
    }
    if (scope === AssignmentScope.BRANCH) {
      const users = await this.prisma.user.findMany({ where: { branchId: scopeId, status: 'ACTIVE' }, select: { id: true } });
      return users.map((u) => u.id);
    }
    // ROLE
    const users = await this.prisma.user.findMany({ where: { role: scopeId as Role, status: 'ACTIVE' }, select: { id: true } });
    return users.map((u) => u.id);
  }

  async listAssignments(actingUser: ActingUser) {
    // Branch Managers only ever see assignments they could have created
    // themselves (own-branch BRANCH assignments, or CONSULTANT assignments
    // targeting someone in their branch) — org-wide ROLE assignments made
    // by an Admin/Director are out of scope for this view.
    const branchScope = actingUser.role === Role.BRANCH_MANAGER ? actingUser.branchId : undefined;
    const branchUserIds = branchScope ? new Set(await this.resolveScopeUserIds(AssignmentScope.BRANCH, branchScope)) : null;

    const assignments = await this.prisma.courseAssignment.findMany({
      where: branchUserIds
        ? { OR: [{ scope: AssignmentScope.BRANCH, scopeId: branchScope! }, { scope: AssignmentScope.CONSULTANT, scopeId: { in: [...branchUserIds] } }] }
        : undefined,
      include: { course: { select: { title: true, category: true } } },
      orderBy: { assignedAt: 'desc' },
      take: 200,
    });

    const assignerIds = [...new Set(assignments.map((a) => a.assignedBy))];
    const assigners = await this.prisma.user.findMany({ where: { id: { in: assignerIds } }, select: { id: true, name: true } });
    const assignerNames = new Map(assigners.map((a) => [a.id, a.name]));

    return Promise.all(
      assignments.map(async (a) => {
        const userIds = await this.resolveScopeUserIds(a.scope, a.scopeId);
        let scopeLabel = a.scopeId;
        if (a.scope === AssignmentScope.CONSULTANT) {
          const u = await this.prisma.user.findUnique({ where: { id: a.scopeId }, select: { name: true } });
          scopeLabel = u?.name ?? a.scopeId;
        } else if (a.scope === AssignmentScope.BRANCH) {
          const b = await this.prisma.branch.findUnique({ where: { id: a.scopeId }, select: { name: true } });
          scopeLabel = b?.name ?? a.scopeId;
        }
        return {
          id: a.id,
          courseId: a.courseId,
          courseTitle: a.course.title,
          scope: a.scope,
          scopeId: a.scopeId,
          scopeLabel,
          dueDate: a.dueDate,
          assignedBy: a.assignedBy,
          assignedByName: assignerNames.get(a.assignedBy) ?? a.assignedBy,
          assignedAt: a.assignedAt,
          notes: a.notes,
          userCount: userIds.length,
        };
      }),
    );
  }

  async completionReport(actingUser: ActingUser, filters: { courseId?: string; branchId?: string }) {
    const branchId = resolveBranchScope(actingUser, filters.branchId);

    const enrollments = await this.prisma.enrollment.findMany({
      where: {
        courseId: filters.courseId,
        user: branchId ? { branchId } : undefined,
      },
      include: {
        course: { select: { title: true, category: true } },
        user: { select: { id: true, name: true, role: true, branch: { select: { id: true, name: true } } } },
        attempts: { orderBy: { attemptedAt: 'desc' }, take: 1 },
        certificate: true,
      },
      orderBy: { enrolledAt: 'desc' },
    });

    const now = new Date();
    return enrollments.map((e) => ({
      enrollmentId: e.id,
      userId: e.user.id,
      userName: e.user.name,
      userRole: e.user.role,
      branchId: e.user.branch?.id ?? null,
      branchName: e.user.branch?.name ?? null,
      courseId: e.courseId,
      courseTitle: e.course.title,
      courseCategory: e.course.category,
      enrolledAt: e.enrolledAt,
      dueDate: e.dueDate,
      completedAt: e.completedAt,
      assigned: !!e.assignedById,
      overdue: !!e.dueDate && !e.completedAt && e.dueDate < now,
      latestScore: e.attempts[0]?.score ?? null,
      certNo: e.certificate?.certNo ?? null,
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
