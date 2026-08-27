import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { RegularisationStatus, Role } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { SAFE_USER_SELECT } from '../common/safe-user.select';
import { CreateRegularisationDto } from './dto/regularisation.dto';

function startOfToday(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

function startOfDay(value: string | Date): Date {
  const d = new Date(value);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

// Inclusive count of the leave request's days that fall inside [monthStart, monthEnd).
// Same clamp the payroll service uses, so "leave days" agree across the two.
function daysOverlapInMonth(reqStart: Date, reqEnd: Date, monthStart: Date, monthEnd: Date): number {
  const from = reqStart > monthStart ? reqStart : monthStart;
  const lastDay = new Date(monthEnd.getTime() - 86400000);
  const to = reqEnd < lastDay ? reqEnd : lastDay;
  if (from > to) return 0;
  return Math.round((to.getTime() - from.getTime()) / 86400000) + 1;
}

@Injectable()
export class AttendanceService {
  constructor(private readonly prisma: PrismaService) {}

  async today(userId: string) {
    return this.prisma.attendance.findUnique({
      where: { userId_date: { userId, date: startOfToday() } },
    });
  }

  // No branch-coordinate data exists yet to check a real geofence radius
  // against, so this is a plausibility floor: reject coordinates that can't
  // be real GPS fixes (out of range, or the (0,0) "Null Island" default a
  // buggy/spoofed client sends when location capture silently fails).
  private assertPlausibleCoords(lat?: number, lng?: number) {
    if (lat === undefined && lng === undefined) return;
    if (lat === undefined || lng === undefined) {
      throw new BadRequestException('Both latitude and longitude are required together');
    }
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      throw new BadRequestException('Location looks invalid — please retry with GPS enabled');
    }
    if (lat === 0 && lng === 0) {
      throw new BadRequestException('Could not capture your location — please retry with GPS enabled');
    }
  }

  async clockIn(userId: string, lat?: number, lng?: number) {
    this.assertPlausibleCoords(lat, lng);
    const date = startOfToday();
    const existing = await this.prisma.attendance.findUnique({ where: { userId_date: { userId, date } } });
    if (existing) throw new BadRequestException('Already clocked in today');
    return this.prisma.attendance.create({
      data: { userId, date, checkInAt: new Date(), checkInLat: lat, checkInLng: lng, status: 'PRESENT' },
    });
  }

  async clockOut(userId: string, lat?: number, lng?: number) {
    this.assertPlausibleCoords(lat, lng);
    const date = startOfToday();
    const existing = await this.prisma.attendance.findUnique({ where: { userId_date: { userId, date } } });
    if (!existing) throw new BadRequestException('Clock in before clocking out');
    if (existing.checkOutAt) throw new BadRequestException('Already clocked out today');
    return this.prisma.attendance.update({
      where: { id: existing.id },
      data: { checkOutAt: new Date(), checkOutLat: lat, checkOutLng: lng },
    });
  }

  async deleteRecord(id: string, actor: { role: Role; branchId: string | null }) {
    const row = await this.prisma.attendance.findUnique({
      where: { id },
      include: { user: { select: { branchId: true } } },
    });
    if (!row) throw new NotFoundException('Attendance record not found');
    if (actor.role === Role.BRANCH_MANAGER && actor.branchId !== row.user.branchId) {
      throw new ForbiddenException("You can only delete your own branch's records");
    }
    await this.prisma.attendance.delete({ where: { id } });
    return { success: true };
  }

  // --- regularisation ------------------------------------------------------
  //
  // A missed punch used to be a permanent, unfixable absence — consultants at
  // airports and hotel site visits forget constantly. This is the correction
  // request; approving it writes the attendance row the punch would have.

  async requestRegularisation(userId: string, dto: CreateRegularisationDto) {
    const date = startOfDay(dto.date);
    if (date > startOfToday()) {
      throw new BadRequestException('You cannot regularise a future date');
    }
    if (!dto.requestedCheckInAt && !dto.requestedCheckOutAt) {
      throw new BadRequestException('Provide at least one of check-in or check-out time');
    }

    const existing = await this.prisma.attendanceRegularisation.findUnique({
      where: { userId_date: { userId, date } },
    });
    // A rejected request is worth re-raising with a better reason; a pending
    // or already-approved one is not.
    if (existing && existing.status !== 'REJECTED') {
      throw new BadRequestException(
        existing.status === 'PENDING'
          ? 'You already have a pending regularisation for that date'
          : 'That date has already been regularised',
      );
    }

    const data = {
      requestedCheckInAt: dto.requestedCheckInAt ? new Date(dto.requestedCheckInAt) : null,
      requestedCheckOutAt: dto.requestedCheckOutAt ? new Date(dto.requestedCheckOutAt) : null,
      reason: dto.reason,
      status: 'PENDING' as const,
      reviewedById: null,
      reviewedAt: null,
      reviewComment: null,
    };

    return existing
      ? this.prisma.attendanceRegularisation.update({ where: { id: existing.id }, data })
      : this.prisma.attendanceRegularisation.create({ data: { userId, date, ...data } });
  }

  findMyRegularisations(userId: string) {
    return this.prisma.attendanceRegularisation.findMany({
      where: { userId },
      orderBy: { date: 'desc' },
    });
  }

  findRegularisations(filter: { branchId?: string; status?: RegularisationStatus }) {
    return this.prisma.attendanceRegularisation.findMany({
      where: {
        status: filter.status,
        user: filter.branchId ? { branchId: filter.branchId } : undefined,
      },
      include: { user: { select: { id: true, name: true, employeeCode: true, branchId: true } } },
      orderBy: [{ status: 'asc' }, { date: 'desc' }],
    });
  }

  async reviewRegularisation(
    id: string,
    status: 'APPROVED' | 'REJECTED',
    reviewerId: string,
    comment: string | undefined,
    actor: { role: Role; branchId: string | null },
  ) {
    const request = await this.prisma.attendanceRegularisation.findUnique({
      where: { id },
      include: { user: { select: SAFE_USER_SELECT } },
    });
    if (!request) throw new NotFoundException('Regularisation request not found');
    if (request.status !== 'PENDING') throw new BadRequestException('This request has already been reviewed');
    // Same self-review bar as leave and reimbursements.
    if (request.userId === reviewerId) {
      throw new ForbiddenException('You cannot review your own regularisation request');
    }
    if (actor.role === Role.BRANCH_MANAGER && actor.branchId !== request.user.branchId) {
      throw new ForbiddenException("You can only review your own branch's requests");
    }

    // Approving is what actually creates/corrects the attendance row —
    // done in one transaction so an approved request can never exist
    // without the attendance it claims to justify.
    return this.prisma.$transaction(async (tx) => {
      if (status === 'APPROVED') {
        await tx.attendance.upsert({
          where: { userId_date: { userId: request.userId, date: request.date } },
          create: {
            userId: request.userId,
            date: request.date,
            checkInAt: request.requestedCheckInAt,
            checkOutAt: request.requestedCheckOutAt,
            status: 'PRESENT',
          },
          update: {
            ...(request.requestedCheckInAt ? { checkInAt: request.requestedCheckInAt } : {}),
            ...(request.requestedCheckOutAt ? { checkOutAt: request.requestedCheckOutAt } : {}),
            status: 'PRESENT',
          },
        });
      }

      return tx.attendanceRegularisation.update({
        where: { id },
        data: {
          status,
          reviewedById: reviewerId,
          reviewedAt: new Date(),
          reviewComment: comment,
        },
      });
    });
  }

  findForBranch(filter: { branchId?: string; month?: string }) {
    const monthStart = filter.month ? new Date(`${filter.month}-01T00:00:00.000Z`) : undefined;
    const monthEnd = monthStart ? new Date(Date.UTC(monthStart.getUTCFullYear(), monthStart.getUTCMonth() + 1, 1)) : undefined;

    return this.prisma.attendance.findMany({
      where: {
        date: monthStart && monthEnd ? { gte: monthStart, lt: monthEnd } : undefined,
        user: filter.branchId ? { branchId: filter.branchId } : undefined,
      },
      include: { user: { select: SAFE_USER_SELECT } },
      orderBy: { date: 'desc' },
    });
  }

  // --- auto-absent marking --------------------------------------------------
  //
  // Attendance used to record only PRESENT punches — a no-show simply left no
  // row, so the team table showed blank gaps instead of a true present/absent
  // picture. This job closes that gap: for a completed day, every ACTIVE
  // employee who neither punched nor has approved leave (and isn't off for a
  // weekly-off or public holiday) gets an ABSENT row written for that day.
  //
  // Idempotent: the [userId, date] unique constraint + skipDuplicates mean a
  // re-run only fills genuinely new gaps, so the daily cron and a manual sweep
  // can both run safely any number of times.
  async markAbsentees(dateInput?: string | Date, opts: { branchId?: string } = {}) {
    // Default target = yesterday. You can only mark absent for a day that is
    // fully over; marking "today" would flag people who simply haven't punched
    // in yet.
    const target = dateInput
      ? startOfDay(dateInput)
      : new Date(startOfToday().getTime() - 86400000);
    if (target >= startOfToday()) {
      throw new BadRequestException('Can only mark absentees for a day that has already ended');
    }
    const dateStr = target.toISOString().slice(0, 10);

    // Sunday is the default weekly off for the business.
    if (target.getUTCDay() === 0) {
      return { date: dateStr, marked: 0, skipped: true, reason: 'Weekly off (Sunday)' };
    }

    // A public holiday for the whole org means nobody is absent that day; a
    // branch-specific holiday only spares that branch.
    const holidays = await this.prisma.holiday.findMany({
      where: { date: target },
      select: { branchId: true },
    });
    if (holidays.some((h) => h.branchId === null)) {
      return { date: dateStr, marked: 0, skipped: true, reason: 'Public holiday' };
    }
    const holidayBranchIds = new Set(holidays.map((h) => h.branchId).filter(Boolean) as string[]);

    const userWhere = opts.branchId ? { branchId: opts.branchId } : {};
    const [activeUsers, punchedRows, leaveRows] = await Promise.all([
      this.prisma.user.findMany({ where: { status: 'ACTIVE', ...userWhere }, select: { id: true, branchId: true } }),
      this.prisma.attendance.findMany({ where: { date: target }, select: { userId: true } }),
      this.prisma.leaveRequest.findMany({
        where: { status: 'APPROVED', startDate: { lte: target }, endDate: { gte: target } },
        select: { userId: true },
      }),
    ]);

    const excused = new Set<string>([...punchedRows.map((r) => r.userId), ...leaveRows.map((r) => r.userId)]);
    const toMark = activeUsers.filter((u) => !excused.has(u.id) && !(u.branchId && holidayBranchIds.has(u.branchId)));

    if (toMark.length === 0) return { date: dateStr, marked: 0, skipped: false };

    const result = await this.prisma.attendance.createMany({
      data: toMark.map((u) => ({ userId: u.id, date: target, status: 'ABSENT' as const })),
      skipDuplicates: true,
    });
    return { date: dateStr, marked: result.count, skipped: false };
  }

  // --- monthly summary ------------------------------------------------------
  //
  // A per-employee roll-up of a month's attendance, computed on read (never
  // persisted) from the raw rows + approved leave. Every ACTIVE employee in
  // scope appears — even with zero punches — so a manager sees who is missing,
  // not just who showed up.
  async monthlySummary(filter: { branchId?: string; month?: string }) {
    const monthStr = filter.month ?? new Date().toISOString().slice(0, 7);
    const start = new Date(`${monthStr}-01T00:00:00.000Z`);
    const end = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 1));
    const userScope = filter.branchId ? { branchId: filter.branchId } : undefined;

    const [activeUsers, rows, leaves] = await Promise.all([
      this.prisma.user.findMany({
        where: { status: 'ACTIVE', ...(filter.branchId ? { branchId: filter.branchId } : {}) },
        select: { id: true, name: true, employeeCode: true, branchId: true },
      }),
      this.prisma.attendance.findMany({
        where: { date: { gte: start, lt: end }, user: userScope },
        select: {
          checkInAt: true,
          checkOutAt: true,
          status: true,
          user: { select: { id: true, name: true, employeeCode: true, branchId: true } },
        },
      }),
      this.prisma.leaveRequest.findMany({
        where: { status: 'APPROVED', startDate: { lt: end }, endDate: { gte: start }, user: userScope },
        select: { userId: true, startDate: true, endDate: true },
      }),
    ]);

    type Agg = {
      userId: string;
      name: string;
      employeeCode: string | null;
      branchId: string | null;
      presentDays: number;
      absentDays: number;
      leaveDays: number;
      totalHours: number;
      daysWithHours: number;
    };
    const byUser = new Map<string, Agg>();
    const ensure = (u: { id: string; name: string; employeeCode: string | null; branchId: string | null }) => {
      let agg = byUser.get(u.id);
      if (!agg) {
        agg = { userId: u.id, name: u.name, employeeCode: u.employeeCode, branchId: u.branchId, presentDays: 0, absentDays: 0, leaveDays: 0, totalHours: 0, daysWithHours: 0 };
        byUser.set(u.id, agg);
      }
      return agg;
    };

    for (const u of activeUsers) ensure(u);
    for (const r of rows) {
      const agg = ensure(r.user);
      if (r.checkInAt) {
        agg.presentDays++;
        if (r.checkOutAt) {
          agg.totalHours += (new Date(r.checkOutAt).getTime() - new Date(r.checkInAt).getTime()) / 3600000;
          agg.daysWithHours++;
        }
      } else if (r.status === 'ABSENT') {
        agg.absentDays++;
      }
    }
    for (const lv of leaves) {
      const agg = byUser.get(lv.userId);
      if (agg) agg.leaveDays += daysOverlapInMonth(lv.startDate, lv.endDate, start, end);
    }

    return Array.from(byUser.values())
      .map((a) => ({
        userId: a.userId,
        name: a.name,
        employeeCode: a.employeeCode,
        branchId: a.branchId,
        presentDays: a.presentDays,
        absentDays: a.absentDays,
        leaveDays: a.leaveDays,
        avgHours: a.daysWithHours ? Math.round((a.totalHours / a.daysWithHours) * 10) / 10 : 0,
        totalHours: Math.round(a.totalHours * 10) / 10,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }
}
