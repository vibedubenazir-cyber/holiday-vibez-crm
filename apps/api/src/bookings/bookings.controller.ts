import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { BookingsService } from './bookings.service';
import { CreateBookingDto } from './dto/booking.dto';
import { UpdateBookingStatusDto } from './dto/update-booking-status.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { resolveBranchScope } from '../common/branch-scope.util';

type AuthUser = { id: string; role: Role; branchId: string | null };

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Roles(Role.DIRECTOR, Role.ADMIN, Role.BRANCH_MANAGER, Role.TRAVEL_CONSULTANT, Role.FINANCE, Role.AUDITOR)
  @Get()
  findAll(@CurrentUser() user: AuthUser) {
    if (user.role === Role.TRAVEL_CONSULTANT) return this.bookingsService.findAll({ consultantId: user.id });
    if (user.role === Role.BRANCH_MANAGER) return this.bookingsService.findAll({ branchId: resolveBranchScope(user) });
    return this.bookingsService.findAll({});
  }

  @Roles(Role.DIRECTOR, Role.ADMIN, Role.BRANCH_MANAGER, Role.TRAVEL_CONSULTANT, Role.FINANCE, Role.AUDITOR)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.bookingsService.findOne(id);
  }

  @Roles(Role.TRAVEL_CONSULTANT, Role.ADMIN, Role.BRANCH_MANAGER)
  @Post()
  create(@Body() dto: CreateBookingDto, @CurrentUser() user: AuthUser) {
    return this.bookingsService.create(dto, user);
  }

  @Roles(Role.TRAVEL_CONSULTANT, Role.ADMIN, Role.BRANCH_MANAGER)
  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body() dto: UpdateBookingStatusDto, @CurrentUser() user: AuthUser) {
    return this.bookingsService.updateStatus(id, dto.status, user);
  }

  @Roles(Role.DIRECTOR, Role.ADMIN)
  @Delete(':id')
  purgeBooking(@Param('id') id: string) {
    return this.bookingsService.purgeBooking(id);
  }
}
