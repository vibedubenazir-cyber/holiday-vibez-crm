import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { ComplianceService } from './compliance.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { resolveBranchScope } from '../common/branch-scope.util';

type AuthUser = { id: string; role: Role; branchId: string | null };
const MANAGER_ROLES = [Role.DIRECTOR, Role.ADMIN, Role.BRANCH_MANAGER];

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('compliance')
export class ComplianceController {
  constructor(private readonly complianceService: ComplianceService) {}

  @Roles(...MANAGER_ROLES)
  @Get('calendar')
  calendar(@CurrentUser() user: AuthUser, @Query('branchId') branchId?: string, @Query('days') days?: string) {
    return this.complianceService.calendar({
      branchId: resolveBranchScope(user, branchId),
      days: days ? Number(days) : undefined,
    });
  }
}
