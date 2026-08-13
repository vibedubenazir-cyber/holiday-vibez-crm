import { BadRequestException, Body, Controller, ForbiddenException, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ExpenseStatus, Role } from '@prisma/client';
import { ExpensesService } from './expenses.service';
import { CreateExpenseDto, ReviewExpenseDto } from './dto/expense.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { resolveBranchScope } from '../common/branch-scope.util';

type AuthUser = { id: string; role: Role; branchId: string | null };
// Expenses can be logged by Branch Manager or Finance as well as Admin/Director,
// so approval sign-off is reserved for the two roles above both of those —
// otherwise a Branch Manager could just approve their own branch's spend.
const APPROVER_ROLES = [Role.DIRECTOR, Role.ADMIN];

// Consultants have no access at all — Accounts & Finance is a Manager/Admin/Director/Finance module.
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('expenses')
export class ExpensesController {
  constructor(private readonly expensesService: ExpensesService) {}

  @Roles(Role.ADMIN, Role.DIRECTOR, Role.BRANCH_MANAGER, Role.FINANCE, Role.AUDITOR)
  @Get()
  findAll(@CurrentUser() user: AuthUser, @Query('branchId') branchId?: string, @Query('status') status?: ExpenseStatus) {
    if (user.role === Role.BRANCH_MANAGER) return this.expensesService.findAll({ branchId: resolveBranchScope(user), status });
    return this.expensesService.findAll({ branchId, status });
  }

  @Roles(Role.ADMIN, Role.DIRECTOR, Role.BRANCH_MANAGER, Role.FINANCE, Role.AUDITOR)
  @Get('summary')
  summary(@CurrentUser() user: AuthUser, @Query('branchId') branchId?: string) {
    if (user.role === Role.BRANCH_MANAGER) return this.expensesService.summaryByCategory({ branchId: resolveBranchScope(user) });
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

  @Roles(...APPROVER_ROLES)
  @Patch(':id/approve')
  approve(@Param('id') id: string, @CurrentUser() user: AuthUser, @Body() dto: ReviewExpenseDto) {
    return this.expensesService.review(id, 'APPROVED', user.id, dto.comment);
  }

  @Roles(...APPROVER_ROLES)
  @Patch(':id/reject')
  reject(@Param('id') id: string, @CurrentUser() user: AuthUser, @Body() dto: ReviewExpenseDto) {
    return this.expensesService.review(id, 'REJECTED', user.id, dto.comment);
  }
}
