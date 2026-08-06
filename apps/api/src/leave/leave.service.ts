import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { LeaveStatus, LeaveType, Role } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { CreateLeaveDto } from './dto/create-leave.dto';

// Fixed annual quotas (days/calendar year) — no per-employee configuration in
// this pass, matching the rest of the CRM's no-config-screen-for-everything
// bias. UNPAID has no quota to exhaust.
const ANNUAL_QUOTA: Record<string, number> = {
  SICK: 10,
  CASUAL: 12,
  ANNUAL: 18,
};

function daysInclusive(start: Date, end: Date): number {
  const ms = end.getTime() - start.getTime();
  return Math.round(ms / 86400000) + 1;
}

@Injectable()
export class LeaveService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateLeaveDto) {
    const startDate = new Date(dto.startDate);
    const endDate = new Date(dto.endDate);
    if (endDate < startDate) {
      throw new BadRequestException('End date must be on or after the start date');
    }
    return this.prisma.leaveRequest.create({
      data: { userId, type: dto.type as LeaveType, startDate, endDate, reason: dto.reason },
    });
  }

  findMine(userId: string) {
    return this.prisma.leaveRequest.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } });
  }

  findForBranch(filter: { branchId?: string }) {
    return this.prisma.leaveRequest.findMany({
      where: { user: filter.branchId ? { branchId: filter.branchId } : undefined },
      include: { user: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async balance(userId: string) {
    const yearStart = new Date(Date.UTC(new Date().getUTCFullYear(), 0, 1));
    const yearEnd = new Date(Date.UTC(new Date().getUTCFullYear() + 1, 0, 1));
    const approved = await this.prisma.leaveRequest.findMany({
      where: { userId, status: 'APPROVED', startDate: { gte: yearStart, lt: yearEnd } },
    });
    const used: Record<string, number> = { SICK: 0, CASUAL: 0, ANNUAL: 0 };
    for (const req of approved) {
      if (req.type in used) used[req.type] += daysInclusive(req.startDate, req.endDate);
    }
    return Object.keys(ANNUAL_QUOTA).map((type) => ({
      type,
      quota: ANNUAL_QUOTA[type],
      used: used[type] ?? 0,
      remaining: ANNUAL_QUOTA[type] - (used[type] ?? 0),
    }));
  }

  async review(id: string, status: 'APPROVED' | 'REJECTED', reviewerId: string, comment: string | undefined, actor: { role: Role; branchId: string | null }) {
    const request = await this.prisma.leaveRequest.findUnique({ where: { id }, include: { user: true } });
    if (!request) throw new NotFoundException('Leave request not found');
    if (request.status !== 'PENDING') throw new BadRequestException('This request has already been reviewed');
    if (actor.role === Role.BRANCH_MANAGER && actor.branchId !== request.user.branchId) {
      throw new ForbiddenException("You can only review your own branch's leave requests");
    }
    return this.prisma.leaveRequest.update({
      where: { id },
      data: { status: status as LeaveStatus, reviewedById: reviewerId, reviewedAt: new Date(), reviewComment: comment },
    });
  }

  async cancel(id: string, userId: string) {
    const request = await this.prisma.leaveRequest.findUnique({ where: { id } });
    if (!request) throw new NotFoundException('Leave request not found');
    if (request.userId !== userId) throw new ForbiddenException('You can only cancel your own leave requests');
    if (request.status !== 'PENDING') throw new BadRequestException('Only a pending request can be cancelled');
    return this.prisma.leaveRequest.update({ where: { id }, data: { status: 'CANCELLED' } });
  }
}
