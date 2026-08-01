import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { TargetsService } from './targets.service';
import { CreateTargetDto } from './dto/target.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('targets')
export class TargetsController {
  constructor(private readonly targetsService: TargetsService) {}

  @Roles(Role.DIRECTOR, Role.ADMIN, Role.BRANCH_MANAGER, Role.TRAVEL_CONSULTANT)
  @Get()
  findAll(@Query('scope') scope?: 'BRANCH' | 'CONSULTANT', @Query('scopeId') scopeId?: string) {
    return this.targetsService.findAll({ scope, scopeId });
  }

  @Roles(Role.DIRECTOR, Role.BRANCH_MANAGER, Role.ADMIN)
  @Post()
  create(@Body() dto: CreateTargetDto) {
    return this.targetsService.create(dto);
  }

  @Roles(Role.DIRECTOR, Role.BRANCH_MANAGER, Role.ADMIN)
  @Get('suggest-split')
  suggestSplit(@Query('branchId') branchId: string, @Query('revenueTarget') revenueTarget: string) {
    return this.targetsService.suggestSplit(branchId, Number(revenueTarget));
  }

  @Roles(Role.DIRECTOR, Role.ADMIN, Role.BRANCH_MANAGER)
  @Get('leaderboard/branch')
  leaderboardByBranch(@Query('branchId') branchId: string) {
    return this.targetsService.leaderboardByBranch(branchId);
  }

  @Roles(Role.DIRECTOR, Role.ADMIN)
  @Get('leaderboard/company')
  leaderboardCompanyWide() {
    return this.targetsService.leaderboardCompanyWide();
  }

  @Roles(Role.DIRECTOR, Role.ADMIN, Role.BRANCH_MANAGER)
  @Get('alerts/under-target')
  underTargetAlerts(@Query('branchId') branchId: string) {
    return this.targetsService.underTargetAlerts(branchId);
  }
}
