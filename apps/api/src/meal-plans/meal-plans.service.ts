import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateMealPlanDto, UpdateMealPlanDto } from './dto/meal-plan.dto';

@Injectable()
export class MealPlansService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.mealPlan.findMany({ orderBy: { name: 'asc' } });
  }

  create(dto: CreateMealPlanDto) {
    return this.prisma.mealPlan.create({ data: dto });
  }

  async update(id: string, dto: UpdateMealPlanDto) {
    const existing = await this.prisma.mealPlan.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Meal plan not found');
    return this.prisma.mealPlan.update({ where: { id }, data: dto });
  }
}
