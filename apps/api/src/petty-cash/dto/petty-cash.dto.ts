import { PettyCashType } from '@prisma/client';
import { IsDateString, IsEnum, IsNumber, IsOptional, IsPositive, IsString } from 'class-validator';

export class CreatePettyCashEntryDto {
  @IsOptional()
  @IsString()
  branchId?: string;

  @IsEnum(PettyCashType)
  type!: PettyCashType;

  @IsNumber()
  @IsPositive()
  amount!: number;

  @IsOptional()
  @IsString()
  category?: string;

  @IsString()
  description!: string;

  @IsDateString()
  entryDate!: string;
}
