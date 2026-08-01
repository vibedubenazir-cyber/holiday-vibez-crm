import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { LeadsService } from './leads.service';
import { CreateLeadDto, UpdateLeadDto } from './dto/lead.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('leads')
export class LeadsController {
  constructor(private readonly leadsService: LeadsService) {}

  @Roles(Role.DIRECTOR, Role.ADMIN, Role.BRANCH_MANAGER, Role.TRAVEL_CONSULTANT)
  @Get()
  findAll(@CurrentUser() user: { id: string; role: Role; branchId: string | null }, @Query('branchId') branchId?: string) {
    // Consultants only ever see their own leads; Manager scoped to own branch (spec Section 2).
    if (user.role === Role.TRAVEL_CONSULTANT) {
      return this.leadsService.findAll({ consultantId: user.id });
    }
    if (user.role === Role.BRANCH_MANAGER) {
      return this.leadsService.findAll({ branchId: user.branchId ?? undefined });
    }
    return this.leadsService.findAll({ branchId });
  }

  @Roles(Role.DIRECTOR, Role.ADMIN, Role.BRANCH_MANAGER)
  @Get('unassigned')
  findUnassigned() {
    return this.leadsService.findUnassigned();
  }

  @Roles(Role.ADMIN, Role.BRANCH_MANAGER)
  @Post()
  create(@Body() dto: CreateLeadDto) {
    return this.leadsService.create(dto);
  }

  @Roles(Role.DIRECTOR, Role.ADMIN, Role.BRANCH_MANAGER, Role.TRAVEL_CONSULTANT)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateLeadDto) {
    return this.leadsService.update(id, dto);
  }

  @Roles(Role.ADMIN, Role.BRANCH_MANAGER)
  @Post(':id/assign')
  assign(@Param('id') id: string, @Body('consultantId') consultantId?: string) {
    return consultantId ? this.leadsService.reassign(id, consultantId) : this.leadsService.autoAssign(id);
  }
}
