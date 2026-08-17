import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { RegularisationStatus, Role } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { CreateRegularisationDto } from './dto/regularisation.dto';

function startOfToday(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

function startOfDay(value: string | Date): Date {
  const d = new Date(value);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
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
      include: { user: true },
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
      include: { user: true },
      orderBy: { date: 'desc' },
    });
  }
}
