import { Type } from 'class-transformer';
import { IsIn, IsInt, IsISO8601, IsNumber, IsOptional, IsPositive, IsString, Max, Min } from 'class-validator';

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

export class SearchTransfersQueryDto {
  @IsString()
  pickup!: string;

  @IsString()
  drop!: string;

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

  @IsIn(['HOTEL', 'FLIGHT', 'TRANSFER'])
  type!: 'HOTEL' | 'FLIGHT' | 'TRANSFER';

  @IsString()
  name!: string;

  @IsString()
  destination!: string;

  // Sane bounds against a wildly fabricated price — this endpoint takes the
  // rate straight from the client (see travel-search.service.ts addToQuotation()
  // for why full server-side re-verification isn't done here), so these caps
  // are a pragmatic mitigation, not a substitute for a real price source.
  @IsNumber()
  @IsPositive()
  @Max(1000000)
  netRate!: number;

  @IsNumber()
  @Min(0)
  @Max(500)
  markupPct!: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  quantity?: number;
}
