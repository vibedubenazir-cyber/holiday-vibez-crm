import { IsBoolean, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateCurrencyRateDto {
  @IsString()
  code!: string;

  @IsNumber()
  @Min(0)
  rateToInr!: number;
}

export class UpdateCurrencyRateDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  rateToInr?: number;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
