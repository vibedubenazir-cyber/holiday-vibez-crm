import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { DataAdminService } from './data-admin.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

// Audit logs can contain sensitive before/after payloads — Admin/Director only.
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('data-admin')
export class DataAdminController {
  constructor(private readonly dataAdminService: DataAdminService) {}

  @Roles(Role.ADMIN, Role.DIRECTOR)
  @Get('audit-logs')
  findAuditLogs(
    @Query('entity') entity?: string,
    @Query('userId') userId?: string,
    @Query('page') page?: string,
  ) {
    return this.dataAdminService.findAuditLogs({
      entity,
      userId,
      page: page ? Number(page) : undefined,
    });
  }

  @Roles(Role.ADMIN, Role.DIRECTOR)
  @Get('stats')
  stats() {
    return this.dataAdminService.stats();
  }
}
