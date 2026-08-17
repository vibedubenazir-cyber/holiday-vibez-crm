import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { AttendanceService } from './attendance.service';
import { PunchDto } from './dto/punch.dto';
import { CreateRegularisationDto, ReviewRegularisationDto } from './dto/regularisation.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { resolveBranchScope } from '../common/branch-scope.util';

type AuthUser = { id: string; role: Role; branchId: string | null };
const ALL_ROLES = [Role.DIRECTOR, Role.ADMIN, Role.BRANCH_MANAGER, Role.TRAVEL_CONSULTANT];
const REVIEW_ROLES = [Role.DIRECTOR, Role.ADMIN, Role.BRANCH_MANAGER];

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

  // --- regularisation -------------------------------------------------------

  @Roles(...ALL_ROLES)
  @Post('regularisations')
  requestRegularisation(@CurrentUser() user: AuthUser, @Body() dto: CreateRegularisationDto) {
    return this.attendanceService.requestRegularisation(user.id, dto);
  }

  @Roles(...ALL_ROLES)
  @Get('regularisations/me')
  myRegularisations(@CurrentUser() user: AuthUser) {
    return this.attendanceService.findMyRegularisations(user.id);
  }

  @Roles(...REVIEW_ROLES)
  @Get('regularisations')
  findRegularisations(
    @CurrentUser() user: AuthUser,
    @Query('branchId') branchId?: string,
    @Query('status') status?: 'PENDING' | 'APPROVED' | 'REJECTED',
  ) {
    return this.attendanceService.findRegularisations({
      branchId: resolveBranchScope(user, branchId),
      status,
    });
  }

  @Roles(...REVIEW_ROLES)
  @Patch('regularisations/:id/approve')
  approveRegularisation(@Param('id') id: string, @CurrentUser() user: AuthUser, @Body() dto: ReviewRegularisationDto) {
    return this.attendanceService.reviewRegularisation(id, 'APPROVED', user.id, dto.reviewComment, user);
  }

  @Roles(...REVIEW_ROLES)
  @Patch('regularisations/:id/reject')
  rejectRegularisation(@Param('id') id: string, @CurrentUser() user: AuthUser, @Body() dto: ReviewRegularisationDto) {
    return this.attendanceService.reviewRegularisation(id, 'REJECTED', user.id, dto.reviewComment, user);
  }
}
