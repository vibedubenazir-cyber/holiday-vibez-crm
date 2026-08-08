import { BadRequestException, Body, Controller, ForbiddenException, Get, Post, Query, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { PettyCashService } from './petty-cash.service';
import { CreatePettyCashEntryDto } from './dto/petty-cash.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { resolveBranchScope } from '../common/branch-scope.util';

type AuthUser = { id: string; role: Role; branchId: string | null };
const FINANCE_ROLES = [Role.ADMIN, Role.DIRECTOR, Role.BRANCH_MANAGER, Role.FINANCE];
const READ_ROLES = [...FINANCE_ROLES, Role.AUDITOR];

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('petty-cash')
export class PettyCashController {
  constructor(private readonly pettyCashService: PettyCashService) {}

  @Roles(...READ_ROLES)
  @Get()
  findAll(@CurrentUser() user: AuthUser, @Query('branchId') branchId?: string) {
    if (user.role === Role.BRANCH_MANAGER) return this.pettyCashService.findAll({ branchId: resolveBranchScope(user) });
    return this.pettyCashService.findAll({ branchId });
  }

  @Roles(...READ_ROLES)
  @Get('balance')
  balance(@CurrentUser() user: AuthUser, @Query('branchId') branchId?: string) {
    if (user.role === Role.BRANCH_MANAGER) return this.pettyCashService.balance({ branchId: resolveBranchScope(user) });
    return this.pettyCashService.balance({ branchId });
  }

  @Roles(...FINANCE_ROLES)
  @Post()
  create(@Body() dto: CreatePettyCashEntryDto, @CurrentUser() user: AuthUser) {
    const branchId = user.role === Role.BRANCH_MANAGER ? user.branchId : dto.branchId;
    if (!branchId) throw new BadRequestException('branchId is required');
    if (user.role === Role.BRANCH_MANAGER && dto.branchId && dto.branchId !== user.branchId) {
      throw new ForbiddenException('You can only log petty cash for your own branch');
    }
    return this.pettyCashService.create(dto, branchId, user.id);
  }
}
