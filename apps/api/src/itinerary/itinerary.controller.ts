import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { ItineraryService } from './itinerary.service';
import {
  CreateAccommodationDto,
  CreateActivityDto,
  CreateItineraryDayDto,
  CreateItineraryNoteDto,
  CreateTransportationDto,
  UpdateItineraryDayDto,
  UpsertItineraryTermsDto,
} from './dto/itinerary.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

type AuthUser = { id: string; role: Role; branchId: string | null };
// Same tiers as QuotationsController: everyone on the quotation's team can
// read it, only the owning consultant/Admin can edit its content.
const READ_ROLES = [Role.DIRECTOR, Role.ADMIN, Role.BRANCH_MANAGER, Role.TRAVEL_CONSULTANT];
const WRITE_ROLES = [Role.TRAVEL_CONSULTANT, Role.ADMIN];

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('quotations/:quotationId/itinerary')
export class ItineraryController {
  constructor(private readonly itineraryService: ItineraryService) {}

  @Roles(...READ_ROLES)
  @Get()
  findOne(@Param('quotationId') quotationId: string, @CurrentUser() user: AuthUser) {
    return this.itineraryService.findByQuotation(quotationId, user);
  }

  @Roles(...WRITE_ROLES)
  @Put('terms')
  upsertTerms(@Param('quotationId') quotationId: string, @Body() dto: UpsertItineraryTermsDto, @CurrentUser() user: AuthUser) {
    return this.itineraryService.upsertTerms(quotationId, dto, user);
  }

  @Roles(...WRITE_ROLES)
  @Post('days')
  addDay(@Param('quotationId') quotationId: string, @Body() dto: CreateItineraryDayDto, @CurrentUser() user: AuthUser) {
    return this.itineraryService.addDay(quotationId, dto, user);
  }

  @Roles(...WRITE_ROLES)
  @Put('days/:dayId')
  updateDay(
    @Param('quotationId') quotationId: string,
    @Param('dayId') dayId: string,
    @Body() dto: UpdateItineraryDayDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.itineraryService.updateDay(quotationId, dayId, dto, user);
  }

  @Roles(...WRITE_ROLES)
  @Delete('days/:dayId')
  removeDay(@Param('quotationId') quotationId: string, @Param('dayId') dayId: string, @CurrentUser() user: AuthUser) {
    return this.itineraryService.removeDay(quotationId, dayId, user);
  }

  @Roles(...WRITE_ROLES)
  @Post('days/:dayId/accommodations')
  addAccommodation(
    @Param('quotationId') quotationId: string,
    @Param('dayId') dayId: string,
    @Body() dto: CreateAccommodationDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.itineraryService.addAccommodation(quotationId, dayId, dto, user);
  }

  @Roles(...WRITE_ROLES)
  @Delete('days/:dayId/accommodations/:id')
  removeAccommodation(
    @Param('quotationId') quotationId: string,
    @Param('dayId') dayId: string,
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.itineraryService.removeAccommodation(quotationId, dayId, id, user);
  }

  @Roles(...WRITE_ROLES)
  @Post('days/:dayId/activities')
  addActivity(
    @Param('quotationId') quotationId: string,
    @Param('dayId') dayId: string,
    @Body() dto: CreateActivityDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.itineraryService.addActivity(quotationId, dayId, dto, user);
  }

  @Roles(...WRITE_ROLES)
  @Delete('days/:dayId/activities/:id')
  removeActivity(
    @Param('quotationId') quotationId: string,
    @Param('dayId') dayId: string,
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.itineraryService.removeActivity(quotationId, dayId, id, user);
  }

  @Roles(...WRITE_ROLES)
  @Post('days/:dayId/transportations')
  addTransportation(
    @Param('quotationId') quotationId: string,
    @Param('dayId') dayId: string,
    @Body() dto: CreateTransportationDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.itineraryService.addTransportation(quotationId, dayId, dto, user);
  }

  @Roles(...WRITE_ROLES)
  @Delete('days/:dayId/transportations/:id')
  removeTransportation(
    @Param('quotationId') quotationId: string,
    @Param('dayId') dayId: string,
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.itineraryService.removeTransportation(quotationId, dayId, id, user);
  }

  @Roles(...WRITE_ROLES)
  @Post('days/:dayId/notes')
  addNote(
    @Param('quotationId') quotationId: string,
    @Param('dayId') dayId: string,
    @Body() dto: CreateItineraryNoteDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.itineraryService.addNote(quotationId, dayId, dto, user);
  }

  @Roles(...WRITE_ROLES)
  @Delete('days/:dayId/notes/:id')
  removeNote(
    @Param('quotationId') quotationId: string,
    @Param('dayId') dayId: string,
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.itineraryService.removeNote(quotationId, dayId, id, user);
  }
}
