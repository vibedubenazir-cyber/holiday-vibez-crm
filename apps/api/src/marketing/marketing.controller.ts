import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { MarketingService } from './marketing.service';
import { CreateCampaignDto } from './dto/campaign.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class MarketingController {
  constructor(private readonly marketingService: MarketingService) {}

  @Roles(Role.ADMIN, Role.DIRECTOR)
  @Get('marketing/dashboard')
  dashboard() {
    return this.marketingService.dashboard();
  }

  @Roles(Role.ADMIN, Role.DIRECTOR)
  @Get('campaigns')
  findAllCampaigns() {
    return this.marketingService.findAllCampaigns();
  }

  @Roles(Role.ADMIN, Role.DIRECTOR)
  @Post('campaigns')
  createCampaign(@Body() dto: CreateCampaignDto, @CurrentUser() user: { id: string }) {
    return this.marketingService.createCampaign(dto, user.id);
  }

  @Roles(Role.ADMIN, Role.DIRECTOR)
  @Post('campaigns/:id/send')
  sendCampaign(@Param('id') id: string) {
    return this.marketingService.sendCampaign(id);
  }
}
