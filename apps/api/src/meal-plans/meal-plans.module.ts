import { Module } from '@nestjs/common';
import { MealPlansController } from './meal-plans.controller';
import { MealPlansService } from './meal-plans.service';
import { PrismaService } from '../prisma.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [MealPlansController],
  providers: [MealPlansService, PrismaService],
  exports: [MealPlansService],
})
export class MealPlansModule {}
