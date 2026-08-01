import { RateCardType } from '@prisma/client';
import { IsBoolean, IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateRateCardDto {
  @IsEnum(RateCardType)
  type!: RateCardType;

  @IsString()
  destination!: string;

  @IsString()
  name!: string;

  @IsNumber()
  baseCost!: number;

  @IsOptional()
  @IsNumber()
  taxPct?: number;

  @IsOptional()
  @IsString()
  currency?: string;
}

export class UpdateRateCardDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsNumber()
  baseCost?: number;

  @IsOptional()
  @IsNumber()
  taxPct?: number;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
