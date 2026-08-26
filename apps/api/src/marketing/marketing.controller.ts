import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { MarketingService } from './marketing.service';
import { CreateCampaignDto } from './dto/campaign.dto';
import { UpsertOccasionDto } from './dto/occasion.dto';
import { ReengagementPreviewDto, ReengagementSendDto } from './dto/reengagement.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

type Actor = { id: string; role: Role; branchId: string | null };

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

  // ---- Festive / occasion greetings ----

  @Roles(Role.ADMIN, Role.DIRECTOR)
  @Get('marketing/occasions')
  listOccasions() {
    return this.marketingService.listOccasions();
  }

  @Roles(Role.ADMIN, Role.DIRECTOR)
  @Post('marketing/occasions')
  createOccasion(@Body() dto: UpsertOccasionDto, @CurrentUser() user: { id: string }) {
    return this.marketingService.createOccasion(dto, user.id);
  }

  @Roles(Role.ADMIN, Role.DIRECTOR)
  @Patch('marketing/occasions/:id')
  updateOccasion(@Param('id') id: string, @Body() dto: UpsertOccasionDto) {
    return this.marketingService.updateOccasion(id, dto);
  }

  @Roles(Role.ADMIN, Role.DIRECTOR)
  @Delete('marketing/occasions/:id')
  deleteOccasion(@Param('id') id: string) {
    return this.marketingService.deleteOccasion(id);
  }

  // ---- Staff-reviewed re-engagement ----

  @Roles(Role.ADMIN, Role.DIRECTOR, Role.BRANCH_MANAGER)
  @Post('marketing/reengagement/preview')
  reengagementPreview(@Body() dto: ReengagementPreviewDto, @CurrentUser() actor: Actor) {
    return this.marketingService.reengagementPreview(dto, actor);
  }

  @Roles(Role.ADMIN, Role.DIRECTOR, Role.BRANCH_MANAGER)
  @Post('marketing/reengagement/send')
  reengagementSend(@Body() dto: ReengagementSendDto, @CurrentUser() actor: Actor) {
    return this.marketingService.reengagementSend(dto, actor);
  }
}
