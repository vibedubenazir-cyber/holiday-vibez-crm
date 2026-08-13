import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class ComplianceService {
  constructor(private readonly prisma: PrismaService) {}

  // Merges two existing data sources (User.probationEndDate, ExitRecord)
  // into one sorted upcoming-dates feed rather than inventing a new
  // generic "compliance event" model for two known event types.
  async calendar(filter: { branchId?: string; days?: number }) {
    const days = filter.days ?? 60;
    const now = new Date();
    const until = new Date(now.getTime() + days * 86400000);

    const [probations, exits] = await Promise.all([
      this.prisma.user.findMany({
        where: { status: 'ACTIVE', probationEndDate: { gte: now, lte: until }, branchId: filter.branchId },
        select: { id: true, name: true, branchId: true, branch: { select: { name: true } }, probationEndDate: true },
      }),
      this.prisma.exitRecord.findMany({
        where: {
          status: 'PENDING',
          lastWorkingDate: { gte: now, lte: until },
          user: filter.branchId ? { branchId: filter.branchId } : undefined,
        },
        include: { user: { select: { id: true, name: true, branchId: true, branch: { select: { name: true } } } } },
      }),
    ]);

    const rows = [
      ...probations.map((u) => ({
        type: 'PROBATION_END' as const,
        userId: u.id,
        userName: u.name,
        branchId: u.branchId,
        branchName: u.branch?.name ?? null,
        date: u.probationEndDate!,
        detail: 'Probation period ends',
      })),
      ...exits.map((e) => ({
        type: 'EXIT' as const,
        userId: e.userId,
        userName: e.user.name,
        branchId: e.user.branchId,
        branchName: e.user.branch?.name ?? null,
        date: e.lastWorkingDate,
        detail: e.type === 'RESIGNATION' ? 'Last working day (resignation)' : 'Last working day (termination)',
      })),
    ];

    return rows.sort((a, b) => a.date.getTime() - b.date.getTime());
  }
}
