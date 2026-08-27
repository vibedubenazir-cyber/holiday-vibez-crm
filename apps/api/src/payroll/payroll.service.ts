import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { SAFE_USER_SELECT } from '../common/safe-user.select';
import { UpsertSalaryStructureDto } from './dto/salary-structure.dto';
import { GeneratePayslipDto } from './dto/generate-payslip.dto';

function monthRange(month: string): { start: Date; end: Date; daysInMonth: number } {
  const [year, mon] = month.split('-').map(Number);
  const start = new Date(Date.UTC(year, mon - 1, 1));
  const end = new Date(Date.UTC(year, mon, 1));
  const daysInMonth = Math.round((end.getTime() - start.getTime()) / 86400000);
  return { start, end, daysInMonth };
}

@Injectable()
export class PayrollService {
  constructor(private readonly prisma: PrismaService) {}

  async upsertSalaryStructure(userId: string, dto: UpsertSalaryStructureDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Employee not found');
    return this.prisma.salaryStructure.upsert({
      where: { userId },
      create: { userId, basicSalary: dto.basicSalary, hra: dto.hra ?? 0, allowances: dto.allowances ?? 0 },
      update: { basicSalary: dto.basicSalary, hra: dto.hra ?? 0, allowances: dto.allowances ?? 0 },
    });
  }

  findSalaryStructure(userId: string) {
    return this.prisma.salaryStructure.findUnique({ where: { userId } });
  }

  listSalaryStructures(filter: { branchId?: string }) {
    return this.prisma.salaryStructure.findMany({
      where: { user: filter.branchId ? { branchId: filter.branchId } : undefined },
      include: { user: { select: SAFE_USER_SELECT } },
      orderBy: { updatedAt: 'desc' },
    });
  }

  // Pay model: the month's WORKING days (calendar days minus Sundays and the
  // employee's public holidays) are what can be earned. A working day the
  // employee neither punched nor spent on approved paid leave is loss-of-pay
  // (LOP), deducted pro-rata off basic. Weekends/holidays never dock pay, and
  // the divisor is working days so full attendance = full basic.
  async generatePayslip(dto: GeneratePayslipDto, generatedBy: string) {
    const structure = await this.prisma.salaryStructure.findUnique({ where: { userId: dto.userId } });
    if (!structure) throw new BadRequestException('This employee has no salary structure configured yet');

    const existing = await this.prisma.payslip.findUnique({ where: { userId_month: { userId: dto.userId, month: dto.month } } });
    if (existing) throw new BadRequestException(`A payslip for ${dto.month} already exists for this employee`);

    const { start, end } = monthRange(dto.month);

    // Working days = every calendar day in the month that isn't a Sunday or a
    // public holiday for this employee's branch (branch-specific + org-wide).
    const employee = await this.prisma.user.findUnique({ where: { id: dto.userId }, select: { branchId: true } });
    const holidayRows = await this.prisma.holiday.findMany({
      where: { date: { gte: start, lt: end }, OR: [{ branchId: employee?.branchId ?? null }, { branchId: null }] },
      select: { date: true },
    });
    const holidaySet = new Set(holidayRows.map((h) => h.date.toISOString().slice(0, 10)));
    const workingDayKeys: string[] = [];
    for (let d = new Date(start); d < end; d = new Date(d.getTime() + 86400000)) {
      const key = d.toISOString().slice(0, 10);
      if (d.getUTCDay() !== 0 && !holidaySet.has(key)) workingDayKeys.push(key);
    }
    const workingDays = workingDayKeys.length;

    // Days the employee actually punched in.
    const punchRows = await this.prisma.attendance.findMany({
      where: { userId: dto.userId, date: { gte: start, lt: end }, checkInAt: { not: null } },
      select: { date: true },
    });
    const punchedDates = new Set(punchRows.map((r) => r.date.toISOString().slice(0, 10)));

    // Dates covered by approved, paid (non-UNPAID) leave, expanded day by day.
    const approvedLeaves = await this.prisma.leaveRequest.findMany({
      where: { userId: dto.userId, status: 'APPROVED', type: { not: 'UNPAID' }, startDate: { lt: end }, endDate: { gte: start } },
      select: { startDate: true, endDate: true },
    });
    const paidLeaveDates = new Set<string>();
    for (const lv of approvedLeaves) {
      const from = lv.startDate > start ? lv.startDate : start;
      for (let d = new Date(from); d < end && d <= lv.endDate; d = new Date(d.getTime() + 86400000)) {
        paidLeaveDates.add(d.toISOString().slice(0, 10));
      }
    }

    // A working day the employee neither punched nor spent on paid leave = LOP.
    const lopDays = workingDayKeys.filter((k) => !punchedDates.has(k) && !paidLeaveDates.has(k)).length;
    const presentDays = punchedDates.size;

    const basic = Number(structure.basicSalary);
    const hra = Number(structure.hra);
    const allowances = Number(structure.allowances);
    const incentive = dto.incentive ?? 0;
    const perDayRate = workingDays > 0 ? basic / workingDays : 0;
    const deductions = Math.round(lopDays * perDayRate * 100) / 100;
    const grossPay = basic + hra + allowances + incentive;
    const netPay = Math.round((grossPay - deductions) * 100) / 100;

    return this.prisma.payslip.create({
      data: {
        userId: dto.userId,
        month: dto.month,
        basicSalary: basic,
        hra,
        allowances,
        incentive,
        deductions,
        grossPay,
        netPay,
        presentDays,
        lopDays,
        generatedBy,
      },
    });
  }

  findMine(userId: string) {
    return this.prisma.payslip.findMany({ where: { userId }, orderBy: { month: 'desc' } });
  }

  async deletePayslip(id: string) {
    const payslip = await this.prisma.payslip.findUnique({ where: { id } });
    if (!payslip) throw new NotFoundException('Payslip not found');
    await this.prisma.payslip.delete({ where: { id } });
    return { success: true };
  }

  findForBranch(filter: { branchId?: string; month?: string }) {
    return this.prisma.payslip.findMany({
      where: {
        month: filter.month,
        user: filter.branchId ? { branchId: filter.branchId } : undefined,
      },
      include: { user: { select: SAFE_USER_SELECT } },
      orderBy: { month: 'desc' },
    });
  }

  async findOneForActor(id: string, actor: { id: string; role: Role; branchId: string | null }) {
    const payslip = await this.prisma.payslip.findUnique({ where: { id }, include: { user: { select: SAFE_USER_SELECT } } });
    if (!payslip) throw new NotFoundException('Payslip not found');
    if (actor.role === Role.TRAVEL_CONSULTANT && payslip.userId !== actor.id) {
      throw new ForbiddenException('You can only view your own payslips');
    }
    if (actor.role === Role.BRANCH_MANAGER && payslip.user.branchId !== actor.branchId && payslip.userId !== actor.id) {
      throw new ForbiddenException("You can only view your own branch's payslips");
    }
    return payslip;
  }
}
