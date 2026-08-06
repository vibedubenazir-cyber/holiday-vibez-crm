import { Body, Controller, Get, Param, Post, Put, Query, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { Role } from '@prisma/client';
import { PayrollService } from './payroll.service';
import { UpsertSalaryStructureDto } from './dto/salary-structure.dto';
import { GeneratePayslipDto } from './dto/generate-payslip.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { streamBrandedPdf } from '../common/pdf.util';
import { getPublicCompanyInfo } from '../common/company-info.util';
import { PrismaService } from '../prisma.service';

type AuthUser = { id: string; role: Role; branchId: string | null };
const ALL_ROLES = [Role.DIRECTOR, Role.ADMIN, Role.BRANCH_MANAGER, Role.TRAVEL_CONSULTANT];
const ADMIN_ROLES = [Role.ADMIN, Role.DIRECTOR];

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('payroll')
export class PayrollController {
  constructor(
    private readonly payrollService: PayrollService,
    private readonly prisma: PrismaService,
  ) {}

  @Roles(...ADMIN_ROLES)
  @Put('salary-structure/:userId')
  upsertSalaryStructure(@Param('userId') userId: string, @Body() dto: UpsertSalaryStructureDto) {
    return this.payrollService.upsertSalaryStructure(userId, dto);
  }

  @Roles(...ADMIN_ROLES)
  @Get('salary-structure')
  listSalaryStructures(@Query('branchId') branchId?: string) {
    return this.payrollService.listSalaryStructures({ branchId });
  }

  @Roles(...ADMIN_ROLES)
  @Post('payslips/generate')
  generate(@CurrentUser() user: AuthUser, @Body() dto: GeneratePayslipDto) {
    return this.payrollService.generatePayslip(dto, user.id);
  }

  @Roles(...ALL_ROLES)
  @Get('payslips/me')
  findMine(@CurrentUser() user: AuthUser) {
    return this.payrollService.findMine(user.id);
  }

  @Roles(...ADMIN_ROLES, Role.BRANCH_MANAGER)
  @Get('payslips')
  findForBranch(@CurrentUser() user: AuthUser, @Query('branchId') branchId?: string, @Query('month') month?: string) {
    const scopedBranchId = user.role === Role.BRANCH_MANAGER ? user.branchId ?? undefined : branchId;
    return this.payrollService.findForBranch({ branchId: scopedBranchId, month });
  }

  @Roles(...ALL_ROLES)
  @Get('payslips/:id/pdf')
  async pdf(@Param('id') id: string, @CurrentUser() user: AuthUser, @Res() res: Response) {
    const payslip = await this.payrollService.findOneForActor(id, user);
    const company = await getPublicCompanyInfo(this.prisma);
    streamBrandedPdf(res, {
      title: 'Salary Slip',
      refNo: `${payslip.month}-${payslip.user.name.split(' ')[0].toUpperCase()}`,
      issuedAt: payslip.generatedAt,
      company,
      clientSectionLabel: 'EMPLOYEE',
      client: { name: payslip.user.name, phone: payslip.user.phone, email: payslip.user.email, destination: payslip.month, destinationLabel: 'Pay period' },
      rows: [
        { label: 'Basic salary', value: `INR ${Number(payslip.basicSalary).toLocaleString('en-IN')}` },
        { label: 'HRA', value: `INR ${Number(payslip.hra).toLocaleString('en-IN')}` },
        { label: 'Allowances', value: `INR ${Number(payslip.allowances).toLocaleString('en-IN')}` },
        { label: 'Incentive', value: `INR ${Number(payslip.incentive).toLocaleString('en-IN')}` },
        { label: `Deductions (${payslip.lopDays} LOP day(s))`, value: `– INR ${Number(payslip.deductions).toLocaleString('en-IN')}` },
        { label: 'Present days', value: `${payslip.presentDays}` },
      ],
      total: { label: 'Net pay', value: `INR ${Number(payslip.netPay).toLocaleString('en-IN')}` },
      footerNote: `This is a system-generated salary slip for ${payslip.month}.`,
    });
  }
}
