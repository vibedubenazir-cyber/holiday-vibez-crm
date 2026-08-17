import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { HrCalendarService } from './hr-calendar.service';
import { CreateHolidayDto, UpdateHolidayDto } from './dto/holiday.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { resolveBranchScope } from '../common/branch-scope.util';

type AuthUser = { id: string; role: Role; branchId: string | null };

// Everyone needs to *read* the holiday list — it drives what shows on the
// leave form and attendance grid. Declaring holidays is an HR action.
const ALL_ROLES = [Role.DIRECTOR, Role.ADMIN, Role.BRANCH_MANAGER, Role.TRAVEL_CONSULTANT, Role.FINANCE, Role.AUDITOR];
const MANAGE_ROLES = [Role.DIRECTOR, Role.ADMIN];

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('holidays')
export class HrCalendarController {
  constructor(private readonly hrCalendarService: HrCalendarService) {}

  @Roles(...ALL_ROLES)
  @Get()
  findAll(
    @CurrentUser() user: AuthUser,
    @Query('branchId') branchId?: string,
    @Query('year') year?: string,
  ) {
    return this.hrCalendarService.findAll({
      branchId: resolveBranchScope(user, branchId),
      year: year ? Number(year) : undefined,
    });
  }

  @Roles(...MANAGE_ROLES)
  @Post()
  create(@Body() dto: CreateHolidayDto) {
    return this.hrCalendarService.create(dto);
  }

  @Roles(...MANAGE_ROLES)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateHolidayDto) {
    return this.hrCalendarService.update(id, dto);
  }

  @Roles(...MANAGE_ROLES)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.hrCalendarService.remove(id);
  }
}
