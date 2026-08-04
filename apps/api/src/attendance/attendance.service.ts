import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

function startOfToday(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

@Injectable()
export class AttendanceService {
  constructor(private readonly prisma: PrismaService) {}

  async today(userId: string) {
    return this.prisma.attendance.findUnique({
      where: { userId_date: { userId, date: startOfToday() } },
    });
  }

  async clockIn(userId: string) {
    const date = startOfToday();
    const existing = await this.prisma.attendance.findUnique({ where: { userId_date: { userId, date } } });
    if (existing) throw new BadRequestException('Already clocked in today');
    return this.prisma.attendance.create({
      data: { userId, date, checkInAt: new Date(), status: 'PRESENT' },
    });
  }

  async clockOut(userId: string) {
    const date = startOfToday();
    const existing = await this.prisma.attendance.findUnique({ where: { userId_date: { userId, date } } });
    if (!existing) throw new BadRequestException('Clock in before clocking out');
    if (existing.checkOutAt) throw new BadRequestException('Already clocked out today');
    return this.prisma.attendance.update({
      where: { id: existing.id },
      data: { checkOutAt: new Date() },
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
