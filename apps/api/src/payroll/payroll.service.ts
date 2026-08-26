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

function daysOverlapInMonth(reqStart: Date, reqEnd: Date, monthStart: Date, monthEnd: Date): number {
  const from = reqStart > monthStart ? reqStart : monthStart;
  const to = reqEnd < monthEnd ? reqEnd : new Date(monthEnd.getTime() - 86400000);
  if (from > to) return 0;
  return Math.round((to.getTime() - from.getTime()) / 86400000) + 1;
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

  // Present days = distinct clocked-in Attendance rows this month. Paid leave
  // days = APPROVED leave (any type except UNPAID) overlapping the month.
  // Everything else in the month is treated as loss-of-pay (LOP), deducted
  // pro-rata off the basic salary — a simple, config-free payroll model
  // rather than a full shift/holiday-calendar engine.
  async generatePayslip(dto: GeneratePayslipDto, generatedBy: string) {
    const structure = await this.prisma.salaryStructure.findUnique({ where: { userId: dto.userId } });
    if (!structure) throw new BadRequestException('This employee has no salary structure configured yet');

    const existing = await this.prisma.payslip.findUnique({ where: { userId_month: { userId: dto.userId, month: dto.month } } });
    if (existing) throw new BadRequestException(`A payslip for ${dto.month} already exists for this employee`);

    const { start, end, daysInMonth } = monthRange(dto.month);

    const presentDays = await this.prisma.attendance.count({
      where: { userId: dto.userId, date: { gte: start, lt: end }, checkInAt: { not: null } },
    });

    const approvedLeaves = await this.prisma.leaveRequest.findMany({
      where: { userId: dto.userId, status: 'APPROVED', type: { not: 'UNPAID' }, startDate: { lt: end }, endDate: { gte: start } },
    });
    const paidLeaveDays = approvedLeaves.reduce((sum, req) => sum + daysOverlapInMonth(req.startDate, req.endDate, start, end), 0);

    const lopDays = Math.max(0, daysInMonth - presentDays - paidLeaveDays);
    const basic = Number(structure.basicSalary);
    const hra = Number(structure.hra);
    const allowances = Number(structure.allowances);
    const incentive = dto.incentive ?? 0;
    const deductions = Math.round((lopDays * (basic / daysInMonth)) * 100) / 100;
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
