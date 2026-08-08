import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { AttendanceService } from './attendance.service';
import { PunchDto } from './dto/punch.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { resolveBranchScope } from '../common/branch-scope.util';

type AuthUser = { id: string; role: Role; branchId: string | null };
const ALL_ROLES = [Role.DIRECTOR, Role.ADMIN, Role.BRANCH_MANAGER, Role.TRAVEL_CONSULTANT];

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('attendance')
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Roles(...ALL_ROLES)
  @Get('me/today')
  today(@CurrentUser() user: AuthUser) {
    return this.attendanceService.today(user.id);
  }

  @Roles(...ALL_ROLES)
  @Post('clock-in')
  clockIn(@CurrentUser() user: AuthUser, @Body() dto: PunchDto) {
    return this.attendanceService.clockIn(user.id, dto.lat, dto.lng);
  }

  @Roles(...ALL_ROLES)
  @Post('clock-out')
  clockOut(@CurrentUser() user: AuthUser, @Body() dto: PunchDto) {
    return this.attendanceService.clockOut(user.id, dto.lat, dto.lng);
  }

  @Roles(Role.ADMIN, Role.DIRECTOR, Role.BRANCH_MANAGER)
  @Get()
  findForBranch(@CurrentUser() user: AuthUser, @Query('branchId') branchId?: string, @Query('month') month?: string) {
    const scopedBranchId = resolveBranchScope(user, branchId);
    return this.attendanceService.findForBranch({ branchId: scopedBranchId, month });
  }
}
