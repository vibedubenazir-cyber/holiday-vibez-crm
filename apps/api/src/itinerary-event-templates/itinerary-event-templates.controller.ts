import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ItineraryEventType, Role } from '@prisma/client';
import { ItineraryEventTemplatesService } from './itinerary-event-templates.service';
import { CreateItineraryEventTemplateDto, UpdateItineraryEventTemplateDto } from './dto/itinerary-event-template.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('itinerary-event-templates')
export class ItineraryEventTemplatesController {
  constructor(private readonly templatesService: ItineraryEventTemplatesService) {}

  @Roles(Role.ADMIN, Role.DIRECTOR, Role.BRANCH_MANAGER, Role.TRAVEL_CONSULTANT)
  @Get()
  findAll(@Query('type') type?: ItineraryEventType, @Query('destination') destination?: string) {
    return this.templatesService.findAll(type, destination);
  }

  @Roles(Role.ADMIN, Role.DIRECTOR)
  @Post()
  create(@Body() dto: CreateItineraryEventTemplateDto) {
    return this.templatesService.create(dto);
  }

  @Roles(Role.ADMIN, Role.DIRECTOR)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateItineraryEventTemplateDto) {
    return this.templatesService.update(id, dto);
  }
}
