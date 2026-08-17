import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { CreateHolidayDto, UpdateHolidayDto } from './dto/holiday.dto';

function toDateOnly(value: string | Date): Date {
  const d = new Date(value);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

@Injectable()
export class HrCalendarService {
  constructor(private readonly prisma: PrismaService) {}

  // A branch sees its own holidays *plus* the org-wide ones (branchId null).
  // Callers without a branch (Director/Admin) see everything.
  private scopeWhere(branchId?: string): Prisma.HolidayWhereInput {
    return branchId ? { OR: [{ branchId }, { branchId: null }] } : {};
  }

  findAll(filter: { branchId?: string; year?: number }) {
    const where: Prisma.HolidayWhereInput = { ...this.scopeWhere(filter.branchId) };
    if (filter.year) {
      where.date = {
        gte: new Date(Date.UTC(filter.year, 0, 1)),
        lt: new Date(Date.UTC(filter.year + 1, 0, 1)),
      };
    }
    return this.prisma.holiday.findMany({
      where,
      include: { branch: { select: { id: true, name: true } } },
      orderBy: { date: 'asc' },
    });
  }

  async create(dto: CreateHolidayDto) {
    try {
      return await this.prisma.holiday.create({
        data: { name: dto.name, date: toDateOnly(dto.date), branchId: dto.branchId ?? null },
      });
    } catch (err) {
      // @@unique([date, branchId]) — the same date can't be declared twice for
      // the same scope, though a branch-specific one may sit alongside an
      // org-wide one on that date.
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new BadRequestException('A holiday is already declared on that date for this scope');
      }
      throw err;
    }
  }

  async update(id: string, dto: UpdateHolidayDto) {
    await this.requireHoliday(id);
    return this.prisma.holiday.update({
      where: { id },
      data: {
        name: dto.name,
        date: dto.date ? toDateOnly(dto.date) : undefined,
        branchId: dto.branchId,
      },
    });
  }

  async remove(id: string) {
    await this.requireHoliday(id);
    await this.prisma.holiday.delete({ where: { id } });
    return { success: true };
  }

  private async requireHoliday(id: string) {
    const holiday = await this.prisma.holiday.findUnique({ where: { id } });
    if (!holiday) throw new NotFoundException('Holiday not found');
    return holiday;
  }

  // --- consumed by Leave and Attendance -------------------------------------

  // The set of holiday dates (as YYYY-MM-DD) inside a range for one branch.
  // Leave uses this so a public holiday inside a leave span doesn't burn a
  // day of the employee's quota, which is what happened before this existed.
  async holidayDatesBetween(start: Date, end: Date, branchId?: string | null): Promise<Set<string>> {
    const holidays = await this.prisma.holiday.findMany({
      where: {
        date: { gte: toDateOnly(start), lte: toDateOnly(end) },
        ...(branchId ? { OR: [{ branchId }, { branchId: null }] } : {}),
      },
      select: { date: true },
    });
    return new Set(holidays.map((h) => h.date.toISOString().slice(0, 10)));
  }
}
