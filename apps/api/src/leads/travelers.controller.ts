import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { TravelersService } from './travelers.service';
import { CreateTravelerDto } from './dto/traveler.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

type AuthUser = { id: string; role: Role; branchId: string | null };

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('leads/:leadId/travelers')
export class TravelersController {
  constructor(private readonly travelersService: TravelersService) {}

  @Roles(Role.DIRECTOR, Role.ADMIN, Role.BRANCH_MANAGER, Role.TRAVEL_CONSULTANT)
  @Get()
  findAll(@Param('leadId') leadId: string, @CurrentUser() user: AuthUser) {
    return this.travelersService.findByLead(leadId, user);
  }

  @Roles(Role.ADMIN, Role.BRANCH_MANAGER, Role.TRAVEL_CONSULTANT)
  @Post()
  create(@Param('leadId') leadId: string, @Body() dto: CreateTravelerDto, @CurrentUser() user: AuthUser) {
    return this.travelersService.create(leadId, dto, user);
  }
}
