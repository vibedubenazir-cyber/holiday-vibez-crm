import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { AppraisalCycleStatus, Role } from '@prisma/client';
import { AppraisalsService } from './appraisals.service';
import { CreateCycleDto, EnrolDto, SubmitManagerReviewDto, SubmitSelfReviewDto } from './dto/appraisal.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { resolveBranchScope } from '../common/branch-scope.util';

type AuthUser = { id: string; role: Role; branchId: string | null };
const ALL_ROLES = [Role.DIRECTOR, Role.ADMIN, Role.BRANCH_MANAGER, Role.TRAVEL_CONSULTANT];
const HR_ROLES = [Role.DIRECTOR, Role.ADMIN];
const MANAGER_ROLES = [Role.DIRECTOR, Role.ADMIN, Role.BRANCH_MANAGER];

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('appraisals')
export class AppraisalsController {
  constructor(private readonly appraisalsService: AppraisalsService) {}

  @Roles(...MANAGER_ROLES)
  @Get('cycles')
  findCycles() {
    return this.appraisalsService.findCycles();
  }

  @Roles(...HR_ROLES)
  @Post('cycles')
  createCycle(@Body() dto: CreateCycleDto) {
    return this.appraisalsService.createCycle(dto);
  }

  @Roles(...HR_ROLES)
  @Patch('cycles/:id/activate')
  activate(@Param('id') id: string) {
    return this.appraisalsService.setCycleStatus(id, AppraisalCycleStatus.ACTIVE);
  }

  @Roles(...HR_ROLES)
  @Patch('cycles/:id/close')
  close(@Param('id') id: string) {
    return this.appraisalsService.setCycleStatus(id, AppraisalCycleStatus.CLOSED);
  }

  @Roles(...HR_ROLES)
  @Post('cycles/:id/enrol')
  enrol(@Param('id') id: string, @Body() dto: EnrolDto) {
    return this.appraisalsService.enrol(id, dto);
  }

  @Roles(...MANAGER_ROLES)
  @Get('cycles/:id/appraisals')
  findForCycle(@Param('id') id: string, @CurrentUser() user: AuthUser, @Query('branchId') branchId?: string) {
    return this.appraisalsService.findForCycle(id, resolveBranchScope(user, branchId));
  }

  @Roles(...ALL_ROLES)
  @Get('me')
  findMine(@CurrentUser() user: AuthUser) {
    return this.appraisalsService.findMine(user.id);
  }

  @Roles(...ALL_ROLES)
  @Get('pending-my-review')
  pendingMyReview(@CurrentUser() user: AuthUser) {
    return this.appraisalsService.findForManager(user.id);
  }

  @Roles(...ALL_ROLES)
  @Patch(':id/self-review')
  selfReview(@Param('id') id: string, @CurrentUser() user: AuthUser, @Body() dto: SubmitSelfReviewDto) {
    return this.appraisalsService.submitSelfReview(id, user, dto);
  }

  @Roles(...ALL_ROLES)
  @Patch(':id/manager-review')
  managerReview(@Param('id') id: string, @CurrentUser() user: AuthUser, @Body() dto: SubmitManagerReviewDto) {
    return this.appraisalsService.submitManagerReview(id, user, dto);
  }
}
