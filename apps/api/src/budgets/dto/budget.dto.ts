import { ExpenseCategory } from '@prisma/client';
import { IsEnum, IsInt, IsNumber, IsOptional, IsPositive, IsString, Max, Min } from 'class-validator';

export class UpsertBudgetDto {
  @IsOptional()
  @IsString()
  branchId?: string;

  @IsEnum(ExpenseCategory)
  category!: ExpenseCategory;

  @IsInt()
  @Min(1)
  @Max(12)
  month!: number;

  @IsInt()
  @Min(2000)
  year!: number;

  @IsNumber()
  @IsPositive()
  budgetedAmount!: number;
}
