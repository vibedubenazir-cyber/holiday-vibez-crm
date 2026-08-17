import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { OnboardingService } from './onboarding.service';
import { AddOnboardingTaskDto, CreateOnboardingDto } from './dto/onboarding.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { resolveBranchScope } from '../common/branch-scope.util';

type AuthUser = { id: string; role: Role; branchId: string | null };
const ALL_ROLES = [Role.DIRECTOR, Role.ADMIN, Role.BRANCH_MANAGER, Role.TRAVEL_CONSULTANT];
const HR_ROLES = [Role.DIRECTOR, Role.ADMIN, Role.BRANCH_MANAGER];

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('onboarding')
export class OnboardingController {
  constructor(private readonly onboardingService: OnboardingService) {}

  // A new joiner should be able to see their own checklist and tick items off.
  @Roles(...ALL_ROLES)
  @Get('me')
  findMine(@CurrentUser() user: AuthUser) {
    return this.onboardingService.findForUser(user.id);
  }

  @Roles(...HR_ROLES)
  @Get()
  inProgress(@CurrentUser() user: AuthUser, @Query('branchId') branchId?: string) {
    return this.onboardingService.inProgress(resolveBranchScope(user, branchId));
  }

  @Roles(...HR_ROLES)
  @Get('user/:userId')
  findForUser(@Param('userId') userId: string) {
    return this.onboardingService.findForUser(userId);
  }

  @Roles(...HR_ROLES)
  @Post()
  create(@Body() dto: CreateOnboardingDto) {
    return this.onboardingService.createForUser(dto);
  }

  @Roles(...HR_ROLES)
  @Post('tasks')
  addTask(@Body() dto: AddOnboardingTaskDto) {
    return this.onboardingService.addTask(dto);
  }

  @Roles(...ALL_ROLES)
  @Patch('tasks/:id/complete')
  complete(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.onboardingService.setComplete(id, true, user.id);
  }

  @Roles(...HR_ROLES)
  @Patch('tasks/:id/reopen')
  reopen(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.onboardingService.setComplete(id, false, user.id);
  }

  @Roles(...HR_ROLES)
  @Delete('tasks/:id')
  remove(@Param('id') id: string) {
    return this.onboardingService.remove(id);
  }
}
