import { BadRequestException, Body, Controller, ForbiddenException, Get, Post, Query, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { ExpensesService } from './expenses.service';
import { CreateExpenseDto } from './dto/expense.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

type AuthUser = { id: string; role: Role; branchId: string | null };

// Consultants have no access at all — Accounts & Finance is a Manager/Admin/Director/Finance module.
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('expenses')
export class ExpensesController {
  constructor(private readonly expensesService: ExpensesService) {}

  @Roles(Role.ADMIN, Role.DIRECTOR, Role.BRANCH_MANAGER, Role.FINANCE, Role.AUDITOR)
  @Get()
  findAll(@CurrentUser() user: AuthUser, @Query('branchId') branchId?: string) {
    if (user.role === Role.BRANCH_MANAGER) return this.expensesService.findAll({ branchId: user.branchId ?? undefined });
    return this.expensesService.findAll({ branchId });
  }

  @Roles(Role.ADMIN, Role.DIRECTOR, Role.BRANCH_MANAGER, Role.FINANCE, Role.AUDITOR)
  @Get('summary')
  summary(@CurrentUser() user: AuthUser, @Query('branchId') branchId?: string) {
    if (user.role === Role.BRANCH_MANAGER) return this.expensesService.summaryByCategory({ branchId: user.branchId ?? undefined });
    return this.expensesService.summaryByCategory({ branchId });
  }

  @Roles(Role.ADMIN, Role.DIRECTOR, Role.BRANCH_MANAGER, Role.FINANCE)
  @Post()
  create(@Body() dto: CreateExpenseDto, @CurrentUser() user: AuthUser) {
    const branchId = user.role === Role.BRANCH_MANAGER ? user.branchId : dto.branchId;
    if (!branchId) throw new BadRequestException('branchId is required');
    if (user.role === Role.BRANCH_MANAGER && dto.branchId && dto.branchId !== user.branchId) {
      throw new ForbiddenException("You can only log expenses for your own branch");
    }
    return this.expensesService.create(dto, branchId, user.id);
  }
}
