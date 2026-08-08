import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { CurrencyService } from './currency.service';
import { CreateCurrencyRateDto, UpdateCurrencyRateDto } from './dto/currency.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

const ALL_ROLES = [Role.DIRECTOR, Role.ADMIN, Role.BRANCH_MANAGER, Role.TRAVEL_CONSULTANT, Role.FINANCE, Role.AUDITOR];

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('currency/rates')
export class CurrencyController {
  constructor(private readonly currencyService: CurrencyService) {}

  @Roles(...ALL_ROLES)
  @Get()
  findAll() {
    return this.currencyService.findAll();
  }

  @Roles(Role.ADMIN, Role.FINANCE)
  @Post()
  create(@Body() dto: CreateCurrencyRateDto) {
    return this.currencyService.create(dto);
  }

  @Roles(Role.ADMIN, Role.FINANCE)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateCurrencyRateDto) {
    return this.currencyService.update(id, dto);
  }
}
