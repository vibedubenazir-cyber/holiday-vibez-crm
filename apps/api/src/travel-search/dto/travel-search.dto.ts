import { Type } from 'class-transformer';
import { IsIn, IsInt, IsISO8601, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class SearchHotelsQueryDto {
  @IsString()
  destination!: string;

  @IsISO8601()
  checkIn!: string;

  @IsISO8601()
  checkOut!: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  guests?: number;
}

export class SearchFlightsQueryDto {
  @IsString()
  origin!: string;

  @IsString()
  destination!: string;

  @IsISO8601()
  date!: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pax?: number;
}

export class AddSearchResultToQuotationDto {
  @IsString()
  quotationId!: string;

  @IsIn(['HOTEL', 'FLIGHT'])
  type!: 'HOTEL' | 'FLIGHT';

  @IsString()
  name!: string;

  @IsString()
  destination!: string;

  @IsNumber()
  @Min(0)
  netRate!: number;

  @IsNumber()
  @Min(0)
  markupPct!: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  quantity?: number;
}
