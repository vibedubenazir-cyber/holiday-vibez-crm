import { BadRequestException, Body, Controller, ForbiddenException, Get, Put, Query, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { BudgetsService } from './budgets.service';
import { UpsertBudgetDto } from './dto/budget.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { resolveBranchScope } from '../common/branch-scope.util';

type AuthUser = { id: string; role: Role; branchId: string | null };
const FINANCE_ROLES = [Role.ADMIN, Role.DIRECTOR, Role.BRANCH_MANAGER, Role.FINANCE];
const READ_ROLES = [...FINANCE_ROLES, Role.AUDITOR];

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('budgets')
export class BudgetsController {
  constructor(private readonly budgetsService: BudgetsService) {}

  @Roles(...READ_ROLES)
  @Get()
  findAll(@CurrentUser() user: AuthUser, @Query('branchId') branchId: string | undefined, @Query('month') month: string, @Query('year') year: string) {
    const scopedBranchId = resolveBranchScope(user, branchId);
    return this.budgetsService.findAll({ branchId: scopedBranchId, month: Number(month), year: Number(year) });
  }

  @Roles(...FINANCE_ROLES)
  @Put()
  upsert(@Body() dto: UpsertBudgetDto, @CurrentUser() user: AuthUser) {
    const branchId = user.role === Role.BRANCH_MANAGER ? user.branchId : dto.branchId;
    if (!branchId) throw new BadRequestException('branchId is required');
    if (user.role === Role.BRANCH_MANAGER && dto.branchId && dto.branchId !== user.branchId) {
      throw new ForbiddenException('You can only set budgets for your own branch');
    }
    return this.budgetsService.upsert(dto, branchId, user.id);
  }
}
