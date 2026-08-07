import { IsNumber, IsOptional, IsPositive, IsString, Min } from 'class-validator';

export class CreateDmcCommissionDto {
  @IsString()
  supplierId!: string;

  @IsOptional()
  @IsString()
  bookingId?: string;

  @IsNumber()
  @IsPositive()
  amount!: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  tdsAmount?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
