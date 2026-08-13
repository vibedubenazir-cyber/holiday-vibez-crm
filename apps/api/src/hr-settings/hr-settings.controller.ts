import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { HrSettingsService } from './hr-settings.service';
import { UpsertHrSettingDto } from './dto/hr-setting.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

const ALL_ROLES = [Role.DIRECTOR, Role.ADMIN, Role.BRANCH_MANAGER, Role.TRAVEL_CONSULTANT, Role.FINANCE, Role.AUDITOR];

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('hr-settings')
export class HrSettingsController {
  constructor(private readonly hrSettingsService: HrSettingsService) {}

  // Read-only for everyone — these are org policy values (leave quotas,
  // notice/probation periods) staff benefit from seeing, only Admin/Director edit.
  @Roles(...ALL_ROLES)
  @Get()
  findAll() {
    return this.hrSettingsService.findAll();
  }

  @Roles(Role.ADMIN, Role.DIRECTOR)
  @Put()
  upsert(@Body() dto: UpsertHrSettingDto) {
    return this.hrSettingsService.upsert(dto);
  }
}
