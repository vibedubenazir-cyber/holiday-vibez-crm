import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { RateCardsService } from './rate-cards.service';
import { CreateRateCardDto, UpdateRateCardDto } from './dto/rate-card.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('rates')
export class RateCardsController {
  constructor(private readonly rateCardsService: RateCardsService) {}

  @Roles(Role.ADMIN, Role.DIRECTOR, Role.BRANCH_MANAGER, Role.TRAVEL_CONSULTANT)
  @Get()
  findAll() {
    return this.rateCardsService.findAll();
  }

  // Write endpoints return 403 for any non-Admin role (spec Section 13 API reference).
  @Roles(Role.ADMIN)
  @Post()
  create(@Body() dto: CreateRateCardDto, @CurrentUser() user: { id: string }) {
    return this.rateCardsService.create(dto, user.id);
  }

  @Roles(Role.ADMIN)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateRateCardDto) {
    return this.rateCardsService.update(id, dto);
  }
}
