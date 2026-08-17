import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { AddOnboardingTaskDto, CreateOnboardingDto, OnboardingTaskItemDto } from './dto/onboarding.dto';

// The joining-side counterpart to ExitRecord's clearance checklist. Seeded
// from a standard list so HR isn't retyping the same eight items per hire.
const DEFAULT_CHECKLIST: OnboardingTaskItemDto[] = [
  { title: 'Collect signed offer letter' },
  { title: 'Collect ID proof (Aadhaar / PAN)', description: 'Upload to the employee document vault' },
  { title: 'Collect bank details for payroll' },
  { title: 'Create email + CRM account' },
  { title: 'Issue laptop / phone', description: 'Record the asset tag under Assets' },
  { title: 'Add to branch team chat channel' },
  { title: 'Assign induction training', description: 'Via LMS → Assign Training' },
  { title: 'Introduce to reporting manager' },
];

@Injectable()
export class OnboardingService {
  constructor(private readonly prisma: PrismaService) {}

  async createForUser(dto: CreateOnboardingDto) {
    const user = await this.prisma.user.findUnique({ where: { id: dto.userId } });
    if (!user) throw new NotFoundException('Employee not found');

    const existing = await this.prisma.onboardingTask.count({ where: { userId: dto.userId } });
    if (existing > 0) {
      throw new BadRequestException('An onboarding checklist already exists for this employee');
    }

    const source = dto.tasks?.length ? dto.tasks : DEFAULT_CHECKLIST;
    await this.prisma.onboardingTask.createMany({
      data: source.map((t, i) => ({
        userId: dto.userId,
        title: t.title,
        description: t.description,
        dueDate: t.dueDate ? new Date(t.dueDate) : undefined,
        sortOrder: i,
      })),
    });
    return this.findForUser(dto.userId);
  }

  findForUser(userId: string) {
    return this.prisma.onboardingTask.findMany({
      where: { userId },
      orderBy: { sortOrder: 'asc' },
    });
  }

  // Everyone with an incomplete checklist, so HR can see who is mid-joining.
  async inProgress(branchId?: string) {
    const tasks = await this.prisma.onboardingTask.findMany({
      where: { user: branchId ? { branchId } : undefined },
      include: { user: { select: { id: true, name: true, employeeCode: true, dateOfJoining: true, branchId: true } } },
      orderBy: { sortOrder: 'asc' },
    });

    const byUser = new Map<string, { user: (typeof tasks)[number]['user']; total: number; done: number }>();
    for (const t of tasks) {
      const row = byUser.get(t.userId) ?? { user: t.user, total: 0, done: 0 };
      row.total++;
      if (t.completed) row.done++;
      byUser.set(t.userId, row);
    }
    return [...byUser.values()]
      .filter((r) => r.done < r.total)
      .map((r) => ({ ...r, pending: r.total - r.done }));
  }

  async addTask(dto: AddOnboardingTaskDto) {
    const last = await this.prisma.onboardingTask.findFirst({
      where: { userId: dto.userId },
      orderBy: { sortOrder: 'desc' },
    });
    return this.prisma.onboardingTask.create({
      data: {
        userId: dto.userId,
        title: dto.title,
        description: dto.description,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
        sortOrder: (last?.sortOrder ?? -1) + 1,
      },
    });
  }

  async setComplete(id: string, completed: boolean, actorId: string) {
    const task = await this.prisma.onboardingTask.findUnique({ where: { id } });
    if (!task) throw new NotFoundException('Onboarding task not found');
    return this.prisma.onboardingTask.update({
      where: { id },
      data: {
        completed,
        completedAt: completed ? new Date() : null,
        completedById: completed ? actorId : null,
      },
    });
  }

  async remove(id: string) {
    const task = await this.prisma.onboardingTask.findUnique({ where: { id } });
    if (!task) throw new NotFoundException('Onboarding task not found');
    await this.prisma.onboardingTask.delete({ where: { id } });
    return { success: true };
  }
}
