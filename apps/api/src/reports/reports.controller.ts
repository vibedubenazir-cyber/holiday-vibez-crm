import { Controller, ForbiddenException, Get, Param, Query, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { resolveBranchScope } from '../common/branch-scope.util';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Roles(Role.DIRECTOR, Role.ADMIN)
  @Get('director-dashboard')
  directorDashboard() {
    return this.reportsService.directorDashboard();
  }

  @Roles(Role.DIRECTOR, Role.ADMIN, Role.BRANCH_MANAGER)
  @Get('branch/:id')
  branchReport(@Param('id') id: string, @CurrentUser() user: { role: Role; branchId: string | null }) {
    if (user.role === Role.BRANCH_MANAGER && user.branchId !== id) {
      throw new ForbiddenException("You can only view your own branch's report");
    }
    return this.reportsService.branchReport(id);
  }

  // Branch Manager is always scoped to their own branch, regardless of what's
  // passed in the query string — Director/Admin can pass any branchId or omit
  // it for an org-wide total.
  @Roles(Role.DIRECTOR, Role.ADMIN, Role.BRANCH_MANAGER, Role.FINANCE, Role.AUDITOR)
  @Get('pnl/monthly')
  monthlyPnL(
    @Query('year') year: string | undefined,
    @Query('branchId') branchId: string | undefined,
    @CurrentUser() user: { role: Role; branchId: string | null },
  ) {
    const resolvedYear = year ? Number(year) : new Date().getFullYear();
    const resolvedBranchId = resolveBranchScope(user, branchId);
    return this.reportsService.getMonthlyPnL(resolvedYear, resolvedBranchId);
  }

  @Roles(Role.DIRECTOR, Role.ADMIN, Role.BRANCH_MANAGER)
  @Get('compliance/expiring')
  complianceExpiring(@CurrentUser() user: { role: Role; branchId: string | null }) {
    return this.reportsService.complianceExpiring(resolveBranchScope(user));
  }

  @Roles(Role.DIRECTOR, Role.ADMIN, Role.BRANCH_MANAGER, Role.FINANCE, Role.AUDITOR)
  @Get('ledger/daily')
  dailyLedger(
    @Query('date') date: string | undefined,
    @Query('branchId') branchId: string | undefined,
    @CurrentUser() user: { role: Role; branchId: string | null },
  ) {
    const resolvedDate = date ?? new Date().toISOString().slice(0, 10);
    const resolvedBranchId = resolveBranchScope(user, branchId);
    return this.reportsService.dailyLedger(resolvedDate, resolvedBranchId);
  }

  @Roles(Role.DIRECTOR, Role.ADMIN, Role.BRANCH_MANAGER, Role.FINANCE, Role.AUDITOR)
  @Get('gst')
  gstReport(
    @Query('year') year: string | undefined,
    @Query('month') month: string | undefined,
    @Query('branchId') branchId: string | undefined,
    @CurrentUser() user: { role: Role; branchId: string | null },
  ) {
    const now = new Date();
    const resolvedYear = year ? Number(year) : now.getFullYear();
    const resolvedMonth = month ? Number(month) : now.getMonth() + 1;
    const resolvedBranchId = resolveBranchScope(user, branchId);
    return this.reportsService.gstReport(resolvedYear, resolvedMonth, resolvedBranchId);
  }

  @Roles(Role.DIRECTOR, Role.ADMIN, Role.BRANCH_MANAGER, Role.FINANCE, Role.AUDITOR)
  @Get('accounts-dashboard')
  accountsDashboard(@Query('branchId') branchId: string | undefined, @CurrentUser() user: { role: Role; branchId: string | null }) {
    const resolvedBranchId = resolveBranchScope(user, branchId);
    return this.reportsService.accountsDashboard(resolvedBranchId);
  }
}
