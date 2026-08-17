import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { LeaveStatus, LeaveType, Prisma, Role } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { HrSettingsService, HR_SETTING_KEYS } from '../hr-settings/hr-settings.service';
import { CreateLeaveDto } from './dto/create-leave.dto';
import { HrCalendarService } from '../hr-calendar/hr-calendar.service';

// Built-in fallback quotas (days/calendar year) — used until an Admin/
// Director overrides them on the HRMS Settings page (see HrSettingsService).
// UNPAID has no quota to exhaust.
const DEFAULT_QUOTA: Record<string, number> = {
  SICK: 10,
  CASUAL: 12,
  ANNUAL: 18,
};
const QUOTA_KEYS: Record<string, string> = {
  SICK: HR_SETTING_KEYS.LEAVE_QUOTA_SICK,
  CASUAL: HR_SETTING_KEYS.LEAVE_QUOTA_CASUAL,
  ANNUAL: HR_SETTING_KEYS.LEAVE_QUOTA_ANNUAL,
};

function daysInclusive(start: Date, end: Date): number {
  const ms = end.getTime() - start.getTime();
  return Math.round(ms / 86400000) + 1;
}

// Clamps [start, end] to the [rangeStart, rangeEnd) window before counting —
// a request spanning a year boundary must only draw against each year's
// quota for the days that actually fall in that year.
function daysInclusiveWithinRange(start: Date, end: Date, rangeStart: Date, rangeEnd: Date): number {
  const clampedStart = start < rangeStart ? rangeStart : start;
  const clampedEnd = end >= rangeEnd ? new Date(rangeEnd.getTime() - 86400000) : end;
  if (clampedEnd < clampedStart) return 0;
  return daysInclusive(clampedStart, clampedEnd);
}

@Injectable()
export class LeaveService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly hrSettings: HrSettingsService,
    private readonly hrCalendar: HrCalendarService,
  ) {}

  // Days a leave request actually costs the employee: calendar days in the
  // range minus any public holiday falling inside it. Before holidays
  // existed, a Diwali-spanning leave silently burned quota for a day nobody
  // was expected to work — the single most disputed thing in HR.
  //
  // Takes a pre-fetched holiday set rather than querying per call: this runs
  // once per approved request inside a Serializable transaction, and N
  // queries there would both slow the txn and widen its conflict window.
  private countChargeable(start: Date, end: Date, holidays: Set<string>, rangeStart?: Date, rangeEnd?: Date): number {
    const from = rangeStart && start < rangeStart ? new Date(rangeStart) : new Date(start);
    const to = rangeEnd && end >= rangeEnd ? new Date(rangeEnd.getTime() - 86400000) : new Date(end);
    if (to < from) return 0;

    let days = 0;
    for (const d = new Date(from); d <= to; d.setUTCDate(d.getUTCDate() + 1)) {
      if (!holidays.has(d.toISOString().slice(0, 10))) days++;
    }
    return days;
  }

  private async branchOf(userId: string): Promise<string | null> {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { branchId: true } });
    return user?.branchId ?? null;
  }

  private getQuota(type: string): Promise<number> {
    return this.hrSettings.getNumber(QUOTA_KEYS[type], DEFAULT_QUOTA[type]);
  }

  async create(userId: string, dto: CreateLeaveDto) {
    const startDate = new Date(dto.startDate);
    const endDate = new Date(dto.endDate);
    if (endDate < startDate) {
      throw new BadRequestException('End date must be on or after the start date');
    }

    // Overlap check against this user's own still-live requests — otherwise
    // two overlapping ranges could both later be approved and double-count
    // the same calendar days against the annual quota in balance().
    const overlapping = await this.prisma.leaveRequest.findFirst({
      where: {
        userId,
        status: { in: ['PENDING', 'APPROVED'] },
        startDate: { lte: endDate },
        endDate: { gte: startDate },
      },
    });
    if (overlapping) {
      throw new BadRequestException('You already have a pending or approved leave request that overlaps these dates');
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
    // Overlap, not "starts in this year" — a request that starts in
    // December and ends in January still owes this year's quota for its
    // December days.
    const approved = await this.prisma.leaveRequest.findMany({
      where: { userId, status: 'APPROVED', startDate: { lt: yearEnd }, endDate: { gte: yearStart } },
    });
    const holidays = await this.hrCalendar.holidayDatesBetween(yearStart, yearEnd, await this.branchOf(userId));
    const used: Record<string, number> = { SICK: 0, CASUAL: 0, ANNUAL: 0 };
    for (const req of approved) {
      if (req.type in used) used[req.type] += this.countChargeable(req.startDate, req.endDate, holidays, yearStart, yearEnd);
    }
    return Promise.all(
      Object.keys(DEFAULT_QUOTA).map(async (type) => {
        const quota = await this.getQuota(type);
        return {
          type,
          quota,
          used: used[type] ?? 0,
          remaining: quota - (used[type] ?? 0),
        };
      }),
    );
  }

  async review(id: string, status: 'APPROVED' | 'REJECTED', reviewerId: string, comment: string | undefined, actor: { role: Role; branchId: string | null }) {
    const request = await this.prisma.leaveRequest.findUnique({ where: { id }, include: { user: true } });
    if (!request) throw new NotFoundException('Leave request not found');
    if (request.status !== 'PENDING') throw new BadRequestException('This request has already been reviewed');
    if (request.userId === reviewerId) {
      throw new ForbiddenException('You cannot approve or reject your own leave request');
    }
    if (actor.role === Role.BRANCH_MANAGER && actor.branchId !== request.user.branchId) {
      throw new ForbiddenException("You can only review your own branch's leave requests");
    }
    // Serializable + retry: two pending requests of the same type reviewed
    // concurrently must not both pass the quota check and jointly exceed it.
    return this.reviewGuarded(id, status, reviewerId, comment);
  }

  private async reviewGuarded(
    id: string,
    status: 'APPROVED' | 'REJECTED',
    reviewerId: string,
    comment: string | undefined,
    attempt = 0,
  ): Promise<Awaited<ReturnType<PrismaService['leaveRequest']['update']>>> {
    try {
      return await this.prisma.$transaction(
        async (tx) => {
          const request = await tx.leaveRequest.findUnique({ where: { id } });
          if (!request) throw new NotFoundException('Leave request not found');
          if (request.status !== 'PENDING') throw new BadRequestException('This request has already been reviewed');

          if (status === 'APPROVED' && request.type in QUOTA_KEYS) {
            const yearStart = new Date(Date.UTC(request.startDate.getUTCFullYear(), 0, 1));
            const yearEnd = new Date(Date.UTC(request.startDate.getUTCFullYear() + 1, 0, 1));
            const approved = await tx.leaveRequest.findMany({
              where: { userId: request.userId, type: request.type, status: 'APPROVED', startDate: { lt: yearEnd }, endDate: { gte: yearStart } },
            });
            const holidays = await this.hrCalendar.holidayDatesBetween(yearStart, yearEnd, await this.branchOf(request.userId));
            const used = approved.reduce((sum, r) => sum + this.countChargeable(r.startDate, r.endDate, holidays, yearStart, yearEnd), 0);
            const quota = await this.getQuota(request.type);
            const remaining = quota - used;
            const requestedDays = this.countChargeable(request.startDate, request.endDate, holidays, yearStart, yearEnd);
            if (requestedDays > remaining) {
              throw new BadRequestException(
                `Approving this would exceed the annual ${request.type} quota (${remaining} day(s) remaining, ${requestedDays} requested)`,
              );
            }
          }

          return tx.leaveRequest.update({
            where: { id },
            data: { status: status as LeaveStatus, reviewedById: reviewerId, reviewedAt: new Date(), reviewComment: comment },
          });
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (err) {
      const isSerializationFailure = err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2034';
      if (isSerializationFailure && attempt < 1) return this.reviewGuarded(id, status, reviewerId, comment, attempt + 1);
      throw err;
    }
  }

  async cancel(id: string, userId: string) {
    const request = await this.prisma.leaveRequest.findUnique({ where: { id } });
    if (!request) throw new NotFoundException('Leave request not found');
    if (request.userId !== userId) throw new ForbiddenException('You can only cancel your own leave requests');
    if (request.status === 'PENDING') {
      return this.prisma.leaveRequest.update({ where: { id }, data: { status: 'CANCELLED' } });
    }
    if (request.status === 'APPROVED') {
      // Once the leave has started, cancelling would retroactively rewrite
      // attendance history it no longer reflects — only a not-yet-started
      // approved leave can be withdrawn (which also frees its quota, since
      // balance() only counts APPROVED requests).
      const today = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate()));
      if (request.startDate <= today) {
        throw new BadRequestException('This leave has already started and can no longer be cancelled');
      }
      return this.prisma.leaveRequest.update({ where: { id }, data: { status: 'CANCELLED' } });
    }
    throw new BadRequestException('Only a pending or upcoming approved request can be cancelled');
  }
}
