import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { CalendarService } from './calendar.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { resolveBranchScope } from '../common/branch-scope.util';

type AuthUser = { id: string; role: Role; branchId: string | null };

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('calendar')
export class CalendarController {
  constructor(private readonly calendarService: CalendarService) {}

  @Roles(Role.DIRECTOR, Role.ADMIN, Role.BRANCH_MANAGER, Role.TRAVEL_CONSULTANT)
  @Get('departures')
  departures(
    @CurrentUser() user: AuthUser,
    @Query('branch') branch?: string,
    @Query('consultant') consultant?: string,
    @Query('range') range?: string,
  ) {
    // Consultant/Manager scoping mirrors the RBAC matrix (spec Section 2) even if the
    // client omits the filter.
    const branchId = user.role === Role.BRANCH_MANAGER ? resolveBranchScope(user) : branch;
    const consultantId = user.role === Role.TRAVEL_CONSULTANT ? user.id : consultant;
    return this.calendarService.departures({ branchId, consultantId, days: range ? Number(range) : undefined });
  }
}
