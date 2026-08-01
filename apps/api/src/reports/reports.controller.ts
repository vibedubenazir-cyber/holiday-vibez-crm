import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

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
  branchReport(@Param('id') id: string) {
    return this.reportsService.branchReport(id);
  }

  @Roles(Role.DIRECTOR, Role.ADMIN, Role.BRANCH_MANAGER)
  @Get('compliance/expiring')
  complianceExpiring() {
    return this.reportsService.complianceExpiring();
  }
}
