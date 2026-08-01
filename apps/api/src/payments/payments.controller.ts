import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/payment.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Roles(Role.DIRECTOR, Role.ADMIN, Role.BRANCH_MANAGER)
  @Get('payments')
  findAll(@Query('bookingId') bookingId?: string) {
    return this.paymentsService.findAll(bookingId);
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

  @Roles(Role.DIRECTOR, Role.ADMIN, Role.BRANCH_MANAGER)
  @Get('finance/branch-pnl')
  branchPnl(@Query('branchId') branchId: string) {
    return this.paymentsService.branchPnl(branchId);
  }
}
