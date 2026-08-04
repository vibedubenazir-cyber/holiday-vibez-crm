import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { InvoicesService } from './invoices.service';
import { CreateInvoiceDto } from './dto/invoice.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

type AuthUser = { id: string; role: Role; branchId: string | null };

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('bookings/:bookingId/invoices')
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  @Roles(Role.DIRECTOR, Role.ADMIN, Role.BRANCH_MANAGER, Role.TRAVEL_CONSULTANT)
  @Get()
  findAll(@Param('bookingId') bookingId: string) {
    return this.invoicesService.findAllForBooking(bookingId);
  }

  @Roles(Role.ADMIN, Role.BRANCH_MANAGER, Role.TRAVEL_CONSULTANT)
  @Post()
  create(@Param('bookingId') bookingId: string, @Body() dto: CreateInvoiceDto, @CurrentUser() user: AuthUser) {
    return this.invoicesService.create(bookingId, dto, user.id, user);
  }
}
