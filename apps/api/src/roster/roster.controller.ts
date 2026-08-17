import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { RosterService } from './roster.service';
import { CreateShiftDto, PublishRosterDto, UpdateShiftDto } from './dto/roster.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { resolveBranchScope } from '../common/branch-scope.util';

type AuthUser = { id: string; role: Role; branchId: string | null };
const ALL_ROLES = [Role.DIRECTOR, Role.ADMIN, Role.BRANCH_MANAGER, Role.TRAVEL_CONSULTANT];
const MANAGE_ROLES = [Role.DIRECTOR, Role.ADMIN, Role.BRANCH_MANAGER];

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('roster')
export class RosterController {
  constructor(private readonly rosterService: RosterService) {}

  @Roles(...ALL_ROLES)
  @Get('shifts')
  findShifts(@CurrentUser() user: AuthUser, @Query('branchId') branchId?: string) {
    return this.rosterService.findShifts(resolveBranchScope(user, branchId));
  }

  @Roles(Role.DIRECTOR, Role.ADMIN)
  @Post('shifts')
  createShift(@Body() dto: CreateShiftDto) {
    return this.rosterService.createShift(dto);
  }

  @Roles(Role.DIRECTOR, Role.ADMIN)
  @Patch('shifts/:id')
  updateShift(@Param('id') id: string, @Body() dto: UpdateShiftDto) {
    return this.rosterService.updateShift(id, dto);
  }

  @Roles(Role.DIRECTOR, Role.ADMIN)
  @Delete('shifts/:id')
  deactivateShift(@Param('id') id: string) {
    return this.rosterService.deactivateShift(id);
  }

  // Every employee needs to know their own shifts.
  @Roles(...ALL_ROLES)
  @Get('me')
  findMine(@CurrentUser() user: AuthUser, @Query('from') from: string, @Query('to') to: string) {
    return this.rosterService.findMyRoster(user.id, from, to);
  }

  @Roles(...MANAGE_ROLES)
  @Get()
  findRoster(
    @CurrentUser() user: AuthUser,
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('branchId') branchId?: string,
    @Query('userId') userId?: string,
  ) {
    return this.rosterService.findRoster({ from, to, branchId: resolveBranchScope(user, branchId), userId });
  }

  @Roles(...MANAGE_ROLES)
  @Post('publish')
  publish(@Body() dto: PublishRosterDto) {
    return this.rosterService.publish(dto);
  }
}
