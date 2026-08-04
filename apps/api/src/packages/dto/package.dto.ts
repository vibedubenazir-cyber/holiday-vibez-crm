import { IsBoolean, IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreatePackageDto {
  @IsString()
  name!: string;

  @IsString()
  destination!: string;

  @IsOptional()
  @IsString()
  theme?: string;

  @IsInt()
  @Min(1)
  durationDays!: number;

  @IsOptional()
  @IsNumber()
  basePrice?: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsString()
  coverImageUrl?: string;
}

export class UpdatePackageDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  theme?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  durationDays?: number;

  @IsOptional()
  @IsNumber()
  basePrice?: number;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class AddPackageItemDto {
  @IsString()
  rateCardId!: string;

  @IsInt()
  @Min(1)
  dayNumber!: number;

  @IsString()
  description!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  quantity?: number;
}

export class BuildQuotationFromPackageDto {
  @IsString()
  leadId!: string;
}
