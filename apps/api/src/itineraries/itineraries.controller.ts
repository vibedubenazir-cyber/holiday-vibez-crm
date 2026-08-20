import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Query, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { Role } from '@prisma/client';
import { ItinerariesService } from './itineraries.service';
import { streamPricingSummaryExcel } from './itinerary-excel.util';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import {
  CreateItineraryImageDto,
  CreateItineraryPlanDayDto,
  CreateItineraryPlanDto,
  CreateItineraryPlanEventDto,
  CreatePricingOptionDto,
  GenerateItineraryDraftDto,
  UpdateItineraryImageDto,
  UpdateItineraryPlanDayDto,
  UpdateItineraryPlanDto,
  UpdateItineraryPlanEventDto,
  UpdatePricingOptionDto,
  UpsertItineraryPackageTermsDto,
} from './dto/itinerary-plan.dto';

type AuthUser = { id: string; role: Role; branchId: string | null };
// Itineraries live in the CRM module's Operations group, visible/editable to
// the same 4 core roles as Leads/Quotations — Finance/Auditor never see this
// nav item. "Own"/branch restriction for Consultant/BranchManager is enforced
// inside ItinerariesService.assertScope, not here.
const ROLES = [Role.DIRECTOR, Role.ADMIN, Role.BRANCH_MANAGER, Role.TRAVEL_CONSULTANT];

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('itineraries')
export class ItinerariesController {
  constructor(private readonly itinerariesService: ItinerariesService) {}

  @Roles(...ROLES)
  @Get()
  list(@CurrentUser() user: AuthUser, @Query('leadId') leadId?: string) {
    return this.itinerariesService.list(user, leadId);
  }

  @Roles(...ROLES)
  @Post()
  create(@Body() dto: CreateItineraryPlanDto, @CurrentUser() user: AuthUser) {
    return this.itinerariesService.create(dto, user);
  }

  @Roles(...ROLES)
  @Post('generate-ai')
  createFromAi(@Body() dto: GenerateItineraryDraftDto, @CurrentUser() user: AuthUser) {
    return this.itinerariesService.createFromAi(dto, user);
  }

  @Roles(...ROLES)
  @Post(':id/duplicate')
  duplicate(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.itinerariesService.duplicate(id, user);
  }

  @Roles(...ROLES)
  @Post(':id/publish')
  publish(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.itinerariesService.publish(id, user);
  }

  @Roles(...ROLES)
  @Post(':id/send')
  send(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.itinerariesService.sendToClient(id, user);
  }

  @Roles(...ROLES)
  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.itinerariesService.findOne(id, user);
  }

  @Roles(...ROLES)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateItineraryPlanDto, @CurrentUser() user: AuthUser) {
    return this.itinerariesService.update(id, dto, user);
  }

  @Roles(...ROLES)
  @Get(':id/pricing-summary')
  pricingSummary(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.itinerariesService.getPricingSummary(id, user);
  }

  @Roles(...ROLES)
  @Get(':id/pricing-summary/export.xlsx')
  async exportPricingSummary(@Param('id') id: string, @CurrentUser() user: AuthUser, @Res() res: Response) {
    const summary = await this.itinerariesService.getPricingSummary(id, user);
    await streamPricingSummaryExcel(res, summary.refNo, summary.options);
  }

  @Roles(...ROLES)
  @Put(':id/package-terms')
  upsertPackageTerms(@Param('id') id: string, @Body() dto: UpsertItineraryPackageTermsDto, @CurrentUser() user: AuthUser) {
    return this.itinerariesService.upsertPackageTerms(id, dto, user);
  }

  @Roles(...ROLES)
  @Post(':id/days')
  addDay(@Param('id') id: string, @Body() dto: CreateItineraryPlanDayDto, @CurrentUser() user: AuthUser) {
    return this.itinerariesService.addDay(id, dto, user);
  }

  @Roles(...ROLES)
  @Patch(':id/days/:dayId')
  updateDay(
    @Param('id') id: string,
    @Param('dayId') dayId: string,
    @Body() dto: UpdateItineraryPlanDayDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.itinerariesService.updateDay(id, dayId, dto, user);
  }

  @Roles(...ROLES)
  @Delete(':id/days/:dayId')
  removeDay(@Param('id') id: string, @Param('dayId') dayId: string, @CurrentUser() user: AuthUser) {
    return this.itinerariesService.removeDay(id, dayId, user);
  }

  @Roles(...ROLES)
  @Post(':id/days/:dayId/events')
  addEvent(
    @Param('id') id: string,
    @Param('dayId') dayId: string,
    @Body() dto: CreateItineraryPlanEventDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.itinerariesService.addEvent(id, dayId, dto, user);
  }

  @Roles(...ROLES)
  @Patch(':id/days/:dayId/events/:eventId')
  updateEvent(
    @Param('id') id: string,
    @Param('dayId') dayId: string,
    @Param('eventId') eventId: string,
    @Body() dto: UpdateItineraryPlanEventDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.itinerariesService.updateEvent(id, dayId, eventId, dto, user);
  }

  @Roles(...ROLES)
  @Delete(':id/days/:dayId/events/:eventId')
  removeEvent(
    @Param('id') id: string,
    @Param('dayId') dayId: string,
    @Param('eventId') eventId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.itinerariesService.removeEvent(id, dayId, eventId, user);
  }

  @Roles(...ROLES)
  @Post(':id/images')
  addImage(@Param('id') id: string, @Body() dto: CreateItineraryImageDto, @CurrentUser() user: AuthUser) {
    return this.itinerariesService.addImage(id, dto, user);
  }

  @Roles(...ROLES)
  @Patch(':id/images/:imageId')
  updateImage(
    @Param('id') id: string,
    @Param('imageId') imageId: string,
    @Body() dto: UpdateItineraryImageDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.itinerariesService.updateImage(id, imageId, dto, user);
  }

  @Roles(...ROLES)
  @Delete(':id/images/:imageId')
  removeImage(@Param('id') id: string, @Param('imageId') imageId: string, @CurrentUser() user: AuthUser) {
    return this.itinerariesService.removeImage(id, imageId, user);
  }

  @Roles(...ROLES)
  @Post(':id/pricing-options')
  addPricingOption(@Param('id') id: string, @Body() dto: CreatePricingOptionDto, @CurrentUser() user: AuthUser) {
    return this.itinerariesService.addPricingOption(id, dto, user);
  }

  @Roles(...ROLES)
  @Patch(':id/pricing-options/:optionId')
  updatePricingOption(
    @Param('id') id: string,
    @Param('optionId') optionId: string,
    @Body() dto: UpdatePricingOptionDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.itinerariesService.updatePricingOption(id, optionId, dto, user);
  }

  @Roles(...ROLES)
  @Delete(':id/pricing-options/:optionId')
  removePricingOption(@Param('id') id: string, @Param('optionId') optionId: string, @CurrentUser() user: AuthUser) {
    return this.itinerariesService.removePricingOption(id, optionId, user);
  }
}
