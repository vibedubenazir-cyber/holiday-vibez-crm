import { Body, Controller, ForbiddenException, Get, Post, Query, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { TargetsService } from './targets.service';
import { CreateTargetDto } from './dto/target.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { resolveBranchScope } from '../common/branch-scope.util';

type AuthUser = { id: string; role: Role; branchId: string | null };

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('targets')
export class TargetsController {
  constructor(private readonly targetsService: TargetsService) {}

  @Roles(Role.DIRECTOR, Role.ADMIN, Role.BRANCH_MANAGER, Role.TRAVEL_CONSULTANT)
  @Get()
  async findAll(@CurrentUser() user: AuthUser, @Query('scope') scope?: 'BRANCH' | 'CONSULTANT', @Query('scopeId') scopeId?: string) {
    if (user.role === Role.TRAVEL_CONSULTANT) {
      // A consultant may only ever see their own targets, regardless of what's passed in.
      return this.targetsService.findAll({ scope: 'CONSULTANT', scopeId: user.id });
    }
    if (user.role === Role.BRANCH_MANAGER) {
      if (scope === 'CONSULTANT' && scopeId) {
        const consultantBranchId = await this.targetsService.consultantBranchId(scopeId);
        if (consultantBranchId !== user.branchId) {
          throw new ForbiddenException("You can only view your own branch's targets");
        }
        return this.targetsService.findAll({ scope, scopeId });
      }
      // Default/BRANCH scope is always forced to the manager's own branch.
      return this.targetsService.findAll({ scope: 'BRANCH', scopeId: resolveBranchScope(user) });
    }
    return this.targetsService.findAll({ scope, scopeId });
  }

  @Roles(Role.DIRECTOR, Role.BRANCH_MANAGER, Role.ADMIN)
  @Post()
  async create(@Body() dto: CreateTargetDto, @CurrentUser() user: AuthUser) {
    if (user.role === Role.BRANCH_MANAGER) {
      if (dto.scope === 'BRANCH' && dto.scopeId !== user.branchId) {
        throw new ForbiddenException("You can only set targets for your own branch");
      }
      if (dto.scope === 'CONSULTANT') {
        const consultantBranchId = await this.targetsService.consultantBranchId(dto.scopeId);
        if (consultantBranchId !== user.branchId) {
          throw new ForbiddenException("You can only set targets for your own branch's consultants");
        }
      }
    }
    return this.targetsService.create(dto);
  }

  @Roles(Role.DIRECTOR, Role.BRANCH_MANAGER, Role.ADMIN)
  @Get('suggest-split')
  suggestSplit(@Query('branchId') branchId: string, @Query('revenueTarget') revenueTarget: string, @CurrentUser() user: AuthUser) {
    this.assertBranchScope(user, branchId);
    return this.targetsService.suggestSplit(branchId, Number(revenueTarget));
  }

  @Roles(Role.DIRECTOR, Role.ADMIN, Role.BRANCH_MANAGER)
  @Get('leaderboard/branch')
  leaderboardByBranch(@Query('branchId') branchId: string, @CurrentUser() user: AuthUser) {
    this.assertBranchScope(user, branchId);
    return this.targetsService.leaderboardByBranch(branchId);
  }

  @Roles(Role.DIRECTOR, Role.ADMIN)
  @Get('leaderboard/company')
  leaderboardCompanyWide() {
    return this.targetsService.leaderboardCompanyWide();
  }

  @Roles(Role.DIRECTOR, Role.ADMIN, Role.BRANCH_MANAGER)
  @Get('alerts/under-target')
  underTargetAlerts(@Query('branchId') branchId: string, @CurrentUser() user: AuthUser) {
    this.assertBranchScope(user, branchId);
    return this.targetsService.underTargetAlerts(branchId);
  }

  private assertBranchScope(user: AuthUser, branchId: string) {
    if (user.role === Role.BRANCH_MANAGER && user.branchId !== branchId) {
      throw new ForbiddenException("You can only act on your own branch's targets");
    }
  }
}
