import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { GrievancesService } from './grievances.service';
import { CreateGrievanceDto, UpdateGrievanceDto } from './dto/grievance.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

type AuthUser = { id: string; role: Role };
const ALL_ROLES = [Role.DIRECTOR, Role.ADMIN, Role.BRANCH_MANAGER, Role.TRAVEL_CONSULTANT];
// Deliberately excludes BRANCH_MANAGER — a grievance (especially a POSH
// complaint) may be about that branch's own manager, so review authority
// stays at Admin/Director only, unlike every other HR module in this app.
const HANDLER_ROLES = [Role.DIRECTOR, Role.ADMIN];

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('grievances')
export class GrievancesController {
  constructor(private readonly grievancesService: GrievancesService) {}

  @Roles(...ALL_ROLES)
  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateGrievanceDto) {
    return this.grievancesService.create(user.id, dto);
  }

  @Roles(...ALL_ROLES)
  @Get('mine')
  findMine(@CurrentUser() user: AuthUser) {
    return this.grievancesService.findMine(user.id);
  }

  @Roles(...HANDLER_ROLES)
  @Get()
  findAll() {
    return this.grievancesService.findAll();
  }

  @Roles(...HANDLER_ROLES)
  @Patch(':id')
  update(@Param('id') id: string, @CurrentUser() user: AuthUser, @Body() dto: UpdateGrievanceDto) {
    return this.grievancesService.update(id, user.id, dto);
  }
}
