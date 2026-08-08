import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { DmcCommissionsService } from './dmc-commissions.service';
import { CreateDmcCommissionDto } from './dto/dmc-commission.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

type AuthUser = { id: string; role: Role; branchId: string | null };
const FINANCE_ROLES = [Role.ADMIN, Role.DIRECTOR, Role.BRANCH_MANAGER, Role.FINANCE];
const READ_ROLES = [...FINANCE_ROLES, Role.AUDITOR];

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('dmc-commissions')
export class DmcCommissionsController {
  constructor(private readonly dmcCommissionsService: DmcCommissionsService) {}

  @Roles(...READ_ROLES)
  @Get()
  findAll(@Query('status') status?: 'PENDING' | 'RECEIVED') {
    return this.dmcCommissionsService.findAll(status);
  }

  @Roles(...FINANCE_ROLES)
  @Post()
  create(@Body() dto: CreateDmcCommissionDto, @CurrentUser() user: AuthUser) {
    return this.dmcCommissionsService.create(dto, user.id);
  }

  @Roles(...FINANCE_ROLES)
  @Patch(':id/received')
  markReceived(@Param('id') id: string) {
    return this.dmcCommissionsService.markReceived(id);
  }
}
