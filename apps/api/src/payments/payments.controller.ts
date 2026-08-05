import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/payment.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

type AuthUser = { id: string; role: Role; branchId: string | null };

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Roles(Role.DIRECTOR, Role.ADMIN, Role.BRANCH_MANAGER)
  @Get('payments')
  findAll(@CurrentUser() user: AuthUser, @Query('bookingId') bookingId?: string) {
    // Branch Manager is always scoped to their own branch (spec Section 13) —
    // Director/Admin can see everything.
    const branchId = user.role === Role.BRANCH_MANAGER ? (user.branchId ?? undefined) : undefined;
    return this.paymentsService.findAll(bookingId, branchId);
  }

  @Roles(Role.ADMIN, Role.BRANCH_MANAGER)
  @Post('payments')
  create(@Body() dto: CreatePaymentDto) {
    return this.paymentsService.create(dto);
  }

  @Roles(Role.ADMIN, Role.BRANCH_MANAGER)
  @Patch('payments/:id/mark-paid')
  markPaid(@Param('id') id: string) {
    return this.paymentsService.markPaid(id);
  }

  @Roles(Role.ADMIN, Role.BRANCH_MANAGER)
  @Post('payments/:id/create-payment-link')
  createPaymentLink(@Param('id') id: string) {
    return this.paymentsService.createPaymentLink(id);
  }

  @Roles(Role.DIRECTOR, Role.ADMIN, Role.BRANCH_MANAGER)
  @Get('finance/branch-pnl')
  branchPnl(@CurrentUser() user: AuthUser, @Query('branchId') branchId: string) {
    // Branch Manager can only ever see their own branch's P&L, regardless of what's queried.
    const effectiveBranchId = user.role === Role.BRANCH_MANAGER ? (user.branchId ?? branchId) : branchId;
    return this.paymentsService.branchPnl(effectiveBranchId);
  }
}
