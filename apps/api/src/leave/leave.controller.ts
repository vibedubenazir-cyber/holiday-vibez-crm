import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { LeaveService } from './leave.service';
import { CreateLeaveDto } from './dto/create-leave.dto';
import { ReviewLeaveDto } from './dto/review-leave.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { resolveBranchScope } from '../common/branch-scope.util';

type AuthUser = { id: string; role: Role; branchId: string | null };
const ALL_ROLES = [Role.DIRECTOR, Role.ADMIN, Role.BRANCH_MANAGER, Role.TRAVEL_CONSULTANT];
const APPROVER_ROLES = [Role.DIRECTOR, Role.ADMIN, Role.BRANCH_MANAGER];

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('leave')
export class LeaveController {
  constructor(private readonly leaveService: LeaveService) {}

  @Roles(...ALL_ROLES)
  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateLeaveDto) {
    return this.leaveService.create(user.id, dto);
  }

  @Roles(...ALL_ROLES)
  @Get('me')
  findMine(@CurrentUser() user: AuthUser) {
    return this.leaveService.findMine(user.id);
  }

  @Roles(...ALL_ROLES)
  @Get('me/balance')
  balance(@CurrentUser() user: AuthUser) {
    return this.leaveService.balance(user.id);
  }

  @Roles(...APPROVER_ROLES)
  @Get()
  findForBranch(@CurrentUser() user: AuthUser, @Query('branchId') branchId?: string) {
    const scopedBranchId = resolveBranchScope(user, branchId);
    return this.leaveService.findForBranch({ branchId: scopedBranchId });
  }

  @Roles(...APPROVER_ROLES)
  @Patch(':id/approve')
  approve(@Param('id') id: string, @CurrentUser() user: AuthUser, @Body() dto: ReviewLeaveDto) {
    return this.leaveService.review(id, 'APPROVED', user.id, dto.comment, user);
  }

  @Roles(...APPROVER_ROLES)
  @Patch(':id/reject')
  reject(@Param('id') id: string, @CurrentUser() user: AuthUser, @Body() dto: ReviewLeaveDto) {
    return this.leaveService.review(id, 'REJECTED', user.id, dto.comment, user);
  }

  @Roles(...ALL_ROLES)
  @Patch(':id/cancel')
  cancel(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.leaveService.cancel(id, user.id);
  }
}
