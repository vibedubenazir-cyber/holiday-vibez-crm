import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { DayItinerariesService } from './day-itineraries.service';
import { CreateDayItineraryDto, UpdateDayItineraryDto } from './dto/day-itinerary.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('day-itineraries')
export class DayItinerariesController {
  constructor(private readonly dayItinerariesService: DayItinerariesService) {}

  @Roles(Role.ADMIN, Role.DIRECTOR, Role.BRANCH_MANAGER, Role.TRAVEL_CONSULTANT)
  @Get()
  findAll() {
    return this.dayItinerariesService.findAll();
  }

  @Roles(Role.ADMIN, Role.DIRECTOR)
  @Post()
  create(@Body() dto: CreateDayItineraryDto) {
    return this.dayItinerariesService.create(dto);
  }

  @Roles(Role.ADMIN, Role.DIRECTOR)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateDayItineraryDto) {
    return this.dayItinerariesService.update(id, dto);
  }
}
