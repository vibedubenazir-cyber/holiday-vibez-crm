import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { AppraisalCycleStatus, AppraisalStatus, Role } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { CreateCycleDto, EnrolDto, SubmitManagerReviewDto, SubmitSelfReviewDto } from './dto/appraisal.dto';

type Actor = { id: string; role: Role; branchId: string | null };

// Unlike the existing ad-hoc PerformanceReview, an appraisal belongs to a
// cycle and walks NOT_STARTED -> SELF_REVIEW -> MANAGER_REVIEW -> COMPLETED.
// Each transition is one-way; there is no path back, so a completed appraisal
// is a stable record for a salary decision.
@Injectable()
export class AppraisalsService {
  constructor(private readonly prisma: PrismaService) {}

  // --- cycles ---------------------------------------------------------------

  findCycles() {
    return this.prisma.appraisalCycle.findMany({
      include: { _count: { select: { appraisals: true } } },
      orderBy: { startDate: 'desc' },
    });
  }

  async createCycle(dto: CreateCycleDto) {
    if (new Date(dto.endDate) < new Date(dto.startDate)) {
      throw new BadRequestException('End date must be on or after the start date');
    }
    return this.prisma.appraisalCycle.create({
      data: { name: dto.name, startDate: new Date(dto.startDate), endDate: new Date(dto.endDate) },
    });
  }

  async setCycleStatus(id: string, status: AppraisalCycleStatus) {
    const cycle = await this.requireCycle(id);
    if (cycle.status === AppraisalCycleStatus.CLOSED) {
      throw new BadRequestException('A closed cycle cannot be reopened');
    }
    return this.prisma.appraisalCycle.update({ where: { id }, data: { status } });
  }

  // Enrol employees into a cycle, seeding each with the same goal set.
  // Employees already enrolled are skipped rather than erroring, so HR can
  // re-run this after new hires join mid-cycle.
  async enrol(cycleId: string, dto: EnrolDto) {
    const cycle = await this.requireCycle(cycleId);
    if (cycle.status === AppraisalCycleStatus.CLOSED) {
      throw new BadRequestException('Cannot enrol into a closed cycle');
    }

    const existing = await this.prisma.appraisal.findMany({
      where: { cycleId, userId: { in: dto.userIds } },
      select: { userId: true },
    });
    const already = new Set(existing.map((e) => e.userId));
    const toAdd = dto.userIds.filter((id) => !already.has(id));

    const users = await this.prisma.user.findMany({
      where: { id: { in: toAdd } },
      select: { id: true, reportsToId: true },
    });

    for (const user of users) {
      await this.prisma.appraisal.create({
        data: {
          cycleId,
          userId: user.id,
          managerId: user.reportsToId,
          goals: dto.goals?.length
            ? { create: dto.goals.map((g, i) => ({ title: g.title, weightPct: g.weightPct ?? 0, sortOrder: i })) }
            : undefined,
        },
      });
    }
    return { enrolled: users.length, skipped: already.size };
  }

  // --- appraisals -----------------------------------------------------------

  findForCycle(cycleId: string, branchId?: string) {
    return this.prisma.appraisal.findMany({
      where: { cycleId, user: branchId ? { branchId } : undefined },
      include: {
        user: { select: { id: true, name: true, employeeCode: true, designation: true, branchId: true } },
        manager: { select: { id: true, name: true } },
        goals: { orderBy: { sortOrder: 'asc' } },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  findMine(userId: string) {
    return this.prisma.appraisal.findMany({
      where: { userId },
      include: { cycle: true, goals: { orderBy: { sortOrder: 'asc' } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  // What a manager owes a review on.
  findForManager(managerId: string) {
    return this.prisma.appraisal.findMany({
      where: { managerId, status: AppraisalStatus.MANAGER_REVIEW },
      include: {
        cycle: true,
        user: { select: { id: true, name: true, employeeCode: true, designation: true } },
        goals: { orderBy: { sortOrder: 'asc' } },
      },
      orderBy: { submittedAt: 'asc' },
    });
  }

  async submitSelfReview(id: string, actor: Actor, dto: SubmitSelfReviewDto) {
    const appraisal = await this.requireAppraisal(id);
    if (appraisal.userId !== actor.id) {
      throw new ForbiddenException('You can only submit your own self-review');
    }
    if (appraisal.status !== AppraisalStatus.NOT_STARTED && appraisal.status !== AppraisalStatus.SELF_REVIEW) {
      throw new BadRequestException('This appraisal has already moved past self-review');
    }
    if (appraisal.cycle.status !== AppraisalCycleStatus.ACTIVE) {
      throw new BadRequestException('This appraisal cycle is not open');
    }

    return this.prisma.$transaction(async (tx) => {
      for (const r of dto.ratings ?? []) {
        await tx.appraisalGoal.updateMany({
          where: { id: r.goalId, appraisalId: id },
          data: { selfRating: r.rating, comments: r.comments },
        });
      }
      return tx.appraisal.update({
        where: { id },
        data: {
          selfComments: dto.selfComments,
          status: AppraisalStatus.MANAGER_REVIEW,
          submittedAt: new Date(),
        },
        include: { goals: { orderBy: { sortOrder: 'asc' } } },
      });
    });
  }

  async submitManagerReview(id: string, actor: Actor, dto: SubmitManagerReviewDto) {
    const appraisal = await this.requireAppraisal(id);
    // Director/Admin can complete on a manager's behalf (manager left, etc);
    // otherwise it must be the assigned manager, and never the employee.
    const isHr = actor.role === Role.DIRECTOR || actor.role === Role.ADMIN;
    if (!isHr && appraisal.managerId !== actor.id) {
      throw new ForbiddenException('Only the assigned manager can complete this review');
    }
    if (appraisal.userId === actor.id) {
      throw new ForbiddenException('You cannot complete your own appraisal');
    }
    if (appraisal.status !== AppraisalStatus.MANAGER_REVIEW) {
      throw new BadRequestException('This appraisal is not awaiting a manager review');
    }

    return this.prisma.$transaction(async (tx) => {
      for (const r of dto.ratings ?? []) {
        await tx.appraisalGoal.updateMany({
          where: { id: r.goalId, appraisalId: id },
          data: { managerRating: r.rating },
        });
      }
      return tx.appraisal.update({
        where: { id },
        data: {
          managerComments: dto.managerComments,
          finalRating: dto.finalRating,
          status: AppraisalStatus.COMPLETED,
          completedAt: new Date(),
        },
        include: { goals: { orderBy: { sortOrder: 'asc' } } },
      });
    });
  }

  private async requireCycle(id: string) {
    const cycle = await this.prisma.appraisalCycle.findUnique({ where: { id } });
    if (!cycle) throw new NotFoundException('Appraisal cycle not found');
    return cycle;
  }

  private async requireAppraisal(id: string) {
    const appraisal = await this.prisma.appraisal.findUnique({ where: { id }, include: { cycle: true } });
    if (!appraisal) throw new NotFoundException('Appraisal not found');
    return appraisal;
  }
}
