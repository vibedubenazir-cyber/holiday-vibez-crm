import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { ExitManagementService } from './exit-management.service';
import { ClearExitRecordDto, CreateExitRecordDto } from './dto/exit-record.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { resolveBranchScope } from '../common/branch-scope.util';

type AuthUser = { id: string; role: Role; branchId: string | null };
const ALL_ROLES = [Role.DIRECTOR, Role.ADMIN, Role.BRANCH_MANAGER, Role.TRAVEL_CONSULTANT];
const MANAGER_ROLES = [Role.DIRECTOR, Role.ADMIN, Role.BRANCH_MANAGER];
// Initiating a termination and clearing an exit are formal HR actions kept
// at Admin/Director tier — Branch Manager can see their branch's exits but
// not action them, same split used for expense approval.
const CLEARANCE_ROLES = [Role.DIRECTOR, Role.ADMIN];

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('exit-management')
export class ExitManagementController {
  constructor(private readonly exitManagementService: ExitManagementService) {}

  @Roles(...ALL_ROLES)
  @Post('resign')
  resign(@CurrentUser() user: AuthUser, @Body() dto: CreateExitRecordDto) {
    return this.exitManagementService.resign(user.id, dto);
  }

  @Roles(...CLEARANCE_ROLES)
  @Post(':userId/terminate')
  terminate(@Param('userId') userId: string, @Body() dto: CreateExitRecordDto) {
    return this.exitManagementService.terminate(userId, dto);
  }

  @Roles(...ALL_ROLES)
  @Get('me')
  findMine(@CurrentUser() user: AuthUser) {
    return this.exitManagementService.findMine(user.id);
  }

  @Roles(...MANAGER_ROLES)
  @Get()
  findAll(@CurrentUser() user: AuthUser, @Query('branchId') branchId?: string) {
    return this.exitManagementService.findAll({ branchId: resolveBranchScope(user, branchId) });
  }

  @Roles(...CLEARANCE_ROLES)
  @Patch(':id/clear')
  clear(@Param('id') id: string, @CurrentUser() user: AuthUser, @Body() dto: ClearExitRecordDto) {
    return this.exitManagementService.clear(id, user.id, dto.exitInterviewNotes);
  }
}
