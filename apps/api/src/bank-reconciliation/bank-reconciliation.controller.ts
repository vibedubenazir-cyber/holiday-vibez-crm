import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { BankReconciliationService } from './bank-reconciliation.service';
import { CreateBankTransactionDto, MatchBankTransactionDto } from './dto/bank-transaction.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

type AuthUser = { id: string; role: Role; branchId: string | null };
const FINANCE_ROLES = [Role.ADMIN, Role.DIRECTOR, Role.BRANCH_MANAGER, Role.FINANCE];
const READ_ROLES = [...FINANCE_ROLES, Role.AUDITOR];

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('bank-transactions')
export class BankReconciliationController {
  constructor(private readonly bankReconciliationService: BankReconciliationService) {}

  @Roles(...READ_ROLES)
  @Get()
  findAll(@CurrentUser() user: AuthUser, @Query('branchId') branchId?: string) {
    if (user.role === Role.BRANCH_MANAGER) return this.bankReconciliationService.findAll({ branchId: user.branchId ?? undefined });
    return this.bankReconciliationService.findAll({ branchId });
  }

  @Roles(...FINANCE_ROLES)
  @Post()
  create(@Body() dto: CreateBankTransactionDto, @CurrentUser() user: AuthUser) {
    const branchId = user.role === Role.BRANCH_MANAGER ? (user.branchId ?? undefined) : dto.branchId;
    return this.bankReconciliationService.create(dto, branchId, user.id);
  }

  @Roles(...FINANCE_ROLES)
  @Patch(':id/match')
  match(@Param('id') id: string, @Body() dto: MatchBankTransactionDto) {
    return this.bankReconciliationService.match(id, dto.paymentId);
  }

  @Roles(...FINANCE_ROLES)
  @Patch(':id/unmatch')
  unmatch(@Param('id') id: string) {
    return this.bankReconciliationService.unmatch(id);
  }
}
