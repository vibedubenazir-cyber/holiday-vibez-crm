import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { MealPlansService } from './meal-plans.service';
import { CreateMealPlanDto, UpdateMealPlanDto } from './dto/meal-plan.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('meal-plans')
export class MealPlansController {
  constructor(private readonly mealPlansService: MealPlansService) {}

  @Roles(Role.ADMIN, Role.DIRECTOR, Role.BRANCH_MANAGER, Role.TRAVEL_CONSULTANT)
  @Get()
  findAll() {
    return this.mealPlansService.findAll();
  }

  @Roles(Role.ADMIN, Role.DIRECTOR)
  @Post()
  create(@Body() dto: CreateMealPlanDto) {
    return this.mealPlansService.create(dto);
  }

  @Roles(Role.ADMIN, Role.DIRECTOR)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateMealPlanDto) {
    return this.mealPlansService.update(id, dto);
  }
}
