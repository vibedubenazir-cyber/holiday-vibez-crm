import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { PerformanceService } from './performance.service';
import { CreatePerformanceReviewDto, UpdatePerformanceReviewDto } from './dto/performance-review.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { resolveBranchScope } from '../common/branch-scope.util';

type AuthUser = { id: string; role: Role; branchId: string | null };
const ALL_ROLES = [Role.DIRECTOR, Role.ADMIN, Role.BRANCH_MANAGER, Role.TRAVEL_CONSULTANT];
const REVIEWER_ROLES = [Role.DIRECTOR, Role.ADMIN, Role.BRANCH_MANAGER];

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('performance')
export class PerformanceController {
  constructor(private readonly performanceService: PerformanceService) {}

  @Roles(...REVIEWER_ROLES)
  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreatePerformanceReviewDto) {
    return this.performanceService.create(user.id, user, dto);
  }

  @Roles(...REVIEWER_ROLES)
  @Patch(':id')
  update(@Param('id') id: string, @CurrentUser() user: AuthUser, @Body() dto: UpdatePerformanceReviewDto) {
    return this.performanceService.update(id, user.id, dto);
  }

  @Roles(...REVIEWER_ROLES)
  @Post(':id/submit')
  submit(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.performanceService.submit(id, user.id);
  }

  @Roles(...ALL_ROLES)
  @Post(':id/acknowledge')
  acknowledge(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.performanceService.acknowledge(id, user.id);
  }

  @Roles(...ALL_ROLES)
  @Get('me')
  findMine(@CurrentUser() user: AuthUser) {
    return this.performanceService.findMine(user.id);
  }

  @Roles(...REVIEWER_ROLES)
  @Get('given')
  findGiven(@CurrentUser() user: AuthUser) {
    return this.performanceService.findGiven(user.id);
  }

  @Roles(...REVIEWER_ROLES)
  @Get()
  findAll(@CurrentUser() user: AuthUser, @Query('branchId') branchId?: string) {
    return this.performanceService.findAll({ branchId: resolveBranchScope(user, branchId) });
  }
}
