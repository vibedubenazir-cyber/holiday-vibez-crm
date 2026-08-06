import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { InsuranceService } from './insurance.service';
import { CreatePolicyDto } from './dto/create-policy.dto';
import { UpdatePolicyStatusDto } from './dto/update-policy-status.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

type AuthUser = { id: string; role: Role };
const ALL_ROLES = [Role.DIRECTOR, Role.ADMIN, Role.BRANCH_MANAGER, Role.TRAVEL_CONSULTANT];

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('insurance')
export class InsuranceController {
  constructor(private readonly insuranceService: InsuranceService) {}

  @Roles(...ALL_ROLES)
  @Get('booking/:bookingId')
  findForBooking(@Param('bookingId') bookingId: string) {
    return this.insuranceService.findForBooking(bookingId);
  }

  @Roles(...ALL_ROLES)
  @Post('booking/:bookingId')
  create(@Param('bookingId') bookingId: string, @Body() dto: CreatePolicyDto, @CurrentUser() user: AuthUser) {
    return this.insuranceService.create(bookingId, dto, user.id);
  }

  @Roles(...ALL_ROLES)
  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body() dto: UpdatePolicyStatusDto) {
    return this.insuranceService.updateStatus(id, dto);
  }
}
