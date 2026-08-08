import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateTargetDto } from './dto/target.dto';

@Injectable()
export class TargetsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(filter: { scope?: 'BRANCH' | 'CONSULTANT'; scopeId?: string }) {
    return this.prisma.target.findMany({ where: filter, orderBy: { createdAt: 'desc' } });
  }

  create(dto: CreateTargetDto) {
    return this.prisma.target.create({
      data: {
        scope: dto.scope,
        scopeId: dto.scopeId,
        period: dto.period,
        revenueTarget: dto.revenueTarget,
        bookingTarget: dto.bookingTarget ?? 0,
        branchId: dto.branchId,
      },
    });
  }

  // "System suggests a per-consultant split which the Branch Manager can adjust"
  // (spec Section 7) — even split across the branch's active consultants.
  async suggestSplit(branchId: string, revenueTarget: number) {
    const consultants = await this.prisma.user.findMany({
      where: { branchId, role: 'TRAVEL_CONSULTANT', status: 'ACTIVE' },
    });
    if (consultants.length === 0) return [];
    const perConsultant = Math.round((revenueTarget / consultants.length) * 100) / 100;
    return consultants.map((c) => ({ consultantId: c.id, name: c.name, suggestedRevenueTarget: perConsultant }));
  }

  // Leaderboard: ranks consultants within a branch, and branches company-wide
  // (spec Section 7) — driven by each scope's most recent Target row.
  async leaderboardByBranch(branchId: string) {
    const consultants = await this.prisma.user.findMany({
      where: { branchId, role: 'TRAVEL_CONSULTANT' },
    });

    const rows = await Promise.all(
      consultants.map(async (c) => {
        const target = await this.prisma.target.findFirst({
          where: { scope: 'CONSULTANT', scopeId: c.id },
          orderBy: { createdAt: 'desc' },
        });
        return {
          consultantId: c.id,
          name: c.name,
          revenueTarget: target ? Number(target.revenueTarget) : 0,
          revenueAchieved: target ? Number(target.revenueAchieved) : 0,
          conversionPct: target && Number(target.revenueTarget) > 0
            ? Math.round((Number(target.revenueAchieved) / Number(target.revenueTarget)) * 1000) / 10
            : 0,
        };
      }),
    );

    return rows.sort((a, b) => b.revenueAchieved - a.revenueAchieved);
  }

  async leaderboardCompanyWide() {
    const branches = await this.prisma.branch.findMany();
    const rows = await Promise.all(
      branches.map(async (b) => {
        const target = await this.prisma.target.findFirst({
          where: { scope: 'BRANCH', scopeId: b.id },
          orderBy: { createdAt: 'desc' },
        });
        return {
          branchId: b.id,
          name: b.name,
          revenueTarget: target ? Number(target.revenueTarget) : 0,
          revenueAchieved: target ? Number(target.revenueAchieved) : 0,
        };
      }),
    );
    return rows.sort((a, b) => b.revenueAchieved - a.revenueAchieved);
  }

  // Mid-period alert if a consultant is trending well behind target (spec Section 7).
  // "Well behind" = achieved less than 50% with less than 50% of the period elapsed... we
  // don't track period start/end precisely at this schema depth, so this flags anything
  // under 40% achieved as a simple, explainable heuristic rather than a fabricated precise one.
  async underTargetAlerts(branchId: string) {
    const rows = await this.leaderboardByBranch(branchId);
    return rows.filter((r) => r.revenueTarget > 0 && r.conversionPct < 40);
  }

  async ensureExists(id: string) {
    const target = await this.prisma.target.findUnique({ where: { id } });
    if (!target) throw new NotFoundException('Target not found');
    return target;
  }

  async consultantBranchId(consultantId: string) {
    const consultant = await this.prisma.user.findUnique({ where: { id: consultantId } });
    return consultant?.branchId ?? null;
  }
}
