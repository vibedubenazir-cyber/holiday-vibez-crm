import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateShiftDto, PublishRosterDto, UpdateShiftDto } from './dto/roster.dto';

function dateOnly(value: string | Date): Date {
  const d = new Date(value);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

@Injectable()
export class RosterService {
  constructor(private readonly prisma: PrismaService) {}

  // --- shifts ---------------------------------------------------------------

  findShifts(branchId?: string) {
    return this.prisma.shift.findMany({
      where: { active: true, ...(branchId ? { OR: [{ branchId }, { branchId: null }] } : {}) },
      orderBy: { startTime: 'asc' },
    });
  }

  createShift(dto: CreateShiftDto) {
    return this.prisma.shift.create({ data: { ...dto, graceMinutes: dto.graceMinutes ?? 10 } });
  }

  async updateShift(id: string, dto: UpdateShiftDto) {
    await this.requireShift(id);
    return this.prisma.shift.update({ where: { id }, data: dto });
  }

  // Soft-delete: rosters already published reference this shift, and hard
  // deletion would orphan them.
  async deactivateShift(id: string) {
    await this.requireShift(id);
    return this.prisma.shift.update({ where: { id }, data: { active: false } });
  }

  private async requireShift(id: string) {
    const shift = await this.prisma.shift.findUnique({ where: { id } });
    if (!shift) throw new NotFoundException('Shift not found');
    return shift;
  }

  // --- roster ---------------------------------------------------------------

  findRoster(filter: { from: string; to: string; branchId?: string; userId?: string }) {
    return this.prisma.rosterEntry.findMany({
      where: {
        date: { gte: dateOnly(filter.from), lte: dateOnly(filter.to) },
        userId: filter.userId,
        user: filter.branchId ? { branchId: filter.branchId } : undefined,
      },
      include: {
        shift: true,
        user: { select: { id: true, name: true, employeeCode: true, branchId: true } },
      },
      orderBy: [{ date: 'asc' }],
    });
  }

  findMyRoster(userId: string, from: string, to: string) {
    return this.prisma.rosterEntry.findMany({
      where: { userId, date: { gte: dateOnly(from), lte: dateOnly(to) } },
      include: { shift: true },
      orderBy: { date: 'asc' },
    });
  }

  // Upsert per (user, date) so re-publishing a week overwrites rather than
  // duplicating — @@unique([userId, date]) enforces that at the DB too.
  async publish(dto: PublishRosterDto) {
    if (dto.assignments.length === 0) {
      throw new BadRequestException('No roster assignments supplied');
    }
    const shiftIds = [...new Set(dto.assignments.map((a) => a.shiftId).filter((s): s is string => Boolean(s)))];
    if (shiftIds.length) {
      const found = await this.prisma.shift.count({ where: { id: { in: shiftIds } } });
      if (found !== shiftIds.length) throw new BadRequestException('One or more shifts do not exist');
    }

    await this.prisma.$transaction(
      dto.assignments.map((a) => {
        const date = dateOnly(a.date);
        const data = { shiftId: a.shiftId ?? null, isWeekOff: a.isWeekOff ?? false };
        return this.prisma.rosterEntry.upsert({
          where: { userId_date: { userId: a.userId, date } },
          create: { userId: a.userId, date, ...data },
          update: data,
        });
      }),
    );
    return { published: dto.assignments.length };
  }
}
