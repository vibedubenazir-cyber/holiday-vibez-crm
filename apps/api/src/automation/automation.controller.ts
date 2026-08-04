import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { AutomationService } from './automation.service';
import { CreateAutomationRuleDto, UpdateAutomationRuleDto } from './dto/automation.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('automation')
export class AutomationController {
  constructor(private readonly automationService: AutomationService) {}

  @Roles(Role.ADMIN, Role.DIRECTOR)
  @Get('rules')
  findAllRules() {
    return this.automationService.findAllRules();
  }

  @Roles(Role.ADMIN, Role.DIRECTOR)
  @Post('rules')
  createRule(@Body() dto: CreateAutomationRuleDto, @CurrentUser() user: { id: string }) {
    return this.automationService.createRule(dto, user.id);
  }

  @Roles(Role.ADMIN, Role.DIRECTOR)
  @Patch('rules/:id')
  updateRule(@Param('id') id: string, @Body() dto: UpdateAutomationRuleDto) {
    return this.automationService.updateRule(id, dto);
  }

  @Roles(Role.ADMIN, Role.DIRECTOR)
  @Get('logs')
  findLogs(@Query('ruleId') ruleId?: string) {
    return this.automationService.findLogs(ruleId);
  }
}
