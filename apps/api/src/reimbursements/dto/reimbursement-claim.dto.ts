import { ReimbursementCategory } from '@prisma/client';
import { IsDateString, IsEnum, IsNumber, IsOptional, IsPositive, IsString } from 'class-validator';

export class CreateReimbursementClaimDto {
  @IsEnum(ReimbursementCategory)
  category!: ReimbursementCategory;

  @IsString()
  description!: string;

  @IsNumber()
  @IsPositive()
  amount!: number;

  @IsDateString()
  expenseDate!: string;

  @IsOptional()
  @IsString()
  receiptUrl?: string;
}

export class ReviewReimbursementClaimDto {
  @IsOptional()
  @IsString()
  comment?: string;
}
