import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { AssetStatus, Role } from '@prisma/client';
import { AssetsService } from './assets.service';
import { AssignAssetDto, CreateAssetDto, UpdateAssetDto } from './dto/asset.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { resolveBranchScope } from '../common/branch-scope.util';

type AuthUser = { id: string; role: Role; branchId: string | null };
const ALL_ROLES = [Role.DIRECTOR, Role.ADMIN, Role.BRANCH_MANAGER, Role.TRAVEL_CONSULTANT];
const MANAGE_ROLES = [Role.DIRECTOR, Role.ADMIN, Role.BRANCH_MANAGER];

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('assets')
export class AssetsController {
  constructor(private readonly assetsService: AssetsService) {}

  @Roles(...MANAGE_ROLES)
  @Get()
  findAll(
    @CurrentUser() user: AuthUser,
    @Query('branchId') branchId?: string,
    @Query('status') status?: AssetStatus,
    @Query('assignedToId') assignedToId?: string,
  ) {
    return this.assetsService.findAll({ branchId: resolveBranchScope(user, branchId), status, assignedToId });
  }

  // Anyone can see what they personally hold — that is their own record.
  @Roles(...ALL_ROLES)
  @Get('me')
  findMine(@CurrentUser() user: AuthUser) {
    return this.assetsService.findForUser(user.id);
  }

  @Roles(...MANAGE_ROLES)
  @Post()
  create(@Body() dto: CreateAssetDto) {
    return this.assetsService.create(dto);
  }

  @Roles(...MANAGE_ROLES)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateAssetDto) {
    return this.assetsService.update(id, dto);
  }

  @Roles(...MANAGE_ROLES)
  @Patch(':id/assign')
  assign(@Param('id') id: string, @Body() dto: AssignAssetDto) {
    return this.assetsService.assign(id, dto);
  }

  @Roles(...MANAGE_ROLES)
  @Patch(':id/return')
  returnAsset(@Param('id') id: string) {
    return this.assetsService.returnAsset(id);
  }

  @Roles(Role.DIRECTOR, Role.ADMIN)
  @Patch(':id/retire')
  retire(@Param('id') id: string) {
    return this.assetsService.retire(id);
  }
}
