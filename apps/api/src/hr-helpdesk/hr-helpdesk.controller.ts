import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { Role, TicketStatus } from '@prisma/client';
import { HrHelpdeskService } from './hr-helpdesk.service';
import { CreateHrTicketDto, UpdateHrTicketDto } from './dto/hr-ticket.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { resolveBranchScope } from '../common/branch-scope.util';

type AuthUser = { id: string; role: Role; branchId: string | null };
const ALL_ROLES = [Role.DIRECTOR, Role.ADMIN, Role.BRANCH_MANAGER, Role.TRAVEL_CONSULTANT];
const MANAGER_ROLES = [Role.DIRECTOR, Role.ADMIN, Role.BRANCH_MANAGER];

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('hr-helpdesk')
export class HrHelpdeskController {
  constructor(private readonly hrHelpdeskService: HrHelpdeskService) {}

  @Roles(...ALL_ROLES)
  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateHrTicketDto) {
    return this.hrHelpdeskService.create(user.id, dto);
  }

  @Roles(...ALL_ROLES)
  @Get('mine')
  findMine(@CurrentUser() user: AuthUser) {
    return this.hrHelpdeskService.findMine(user.id);
  }

  @Roles(...MANAGER_ROLES)
  @Get()
  findAll(@CurrentUser() user: AuthUser, @Query('branchId') branchId?: string, @Query('status') status?: TicketStatus) {
    return this.hrHelpdeskService.findAll({ branchId: resolveBranchScope(user, branchId), status });
  }

  @Roles(...ALL_ROLES)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateHrTicketDto, @CurrentUser() user: AuthUser) {
    return this.hrHelpdeskService.update(id, dto, user);
  }
}
