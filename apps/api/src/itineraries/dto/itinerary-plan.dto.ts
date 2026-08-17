import { ItineraryEventType, ItineraryPlanStatus, TransportationType } from '@prisma/client';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateIf,
} from 'class-validator';

export class CreateItineraryPlanDto {
  @IsString()
  title!: string;

  @IsOptional()
  @IsString()
  leadId?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  destinations?: string[];

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  adultsCount?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  childrenCount?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  infantsCount?: number;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  theme?: string;

  @IsOptional()
  @IsBoolean()
  showOnWebsite?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  websitePerPersonPrice?: number;

  @IsOptional()
  @IsDateString()
  websiteValidUntil?: string;

  @IsOptional()
  @IsBoolean()
  isPopular?: boolean;

  @IsOptional()
  @IsBoolean()
  isSpecial?: boolean;

  @IsOptional()
  @IsString()
  aboutPackage?: string;
}

export class UpdateItineraryPlanDto {
  @IsOptional()
  @IsString()
  title?: string;

  // null unlinks the lead; a string re-links to a different one.
  @IsOptional()
  @ValidateIf((o: UpdateItineraryPlanDto) => o.leadId !== null)
  @IsString()
  leadId?: string | null;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  destinations?: string[];

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  adultsCount?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  childrenCount?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  infantsCount?: number;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  coverPhotoUrl?: string;

  @IsOptional()
  @IsString()
  theme?: string;

  @IsOptional()
  @IsEnum(ItineraryPlanStatus)
  status?: ItineraryPlanStatus;

  @IsOptional()
  @IsBoolean()
  showOnWebsite?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  websitePerPersonPrice?: number;

  @IsOptional()
  @IsDateString()
  websiteValidUntil?: string;

  @IsOptional()
  @IsBoolean()
  isPopular?: boolean;

  @IsOptional()
  @IsBoolean()
  isSpecial?: boolean;

  @IsOptional()
  @IsString()
  aboutPackage?: string;
}

export class CreateItineraryPlanDayDto {
  @IsInt()
  @Min(1)
  dayNumber!: number;

  @IsOptional()
  @IsDateString()
  date?: string;
}

export class UpdateItineraryPlanDayDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  dayNumber?: number;

  @IsOptional()
  @IsDateString()
  date?: string;
}

class ItineraryAddOnDto {
  @IsString()
  name!: string;

  @IsNumber()
  price!: number;
}

export class CreateItineraryPlanEventDto {
  @IsEnum(ItineraryEventType)
  type!: ItineraryEventType;

  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  destination?: string;

  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsString()
  startTime?: string;

  @IsOptional()
  @IsString()
  endTime?: string;

  @IsOptional()
  @IsBoolean()
  showTime?: boolean;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  photoUrl?: string;

  @IsOptional()
  @IsEnum(TransportationType)
  transferType?: TransportationType;

  @IsOptional()
  @IsNumber()
  @Min(0)
  netAmount?: number;

  @IsOptional()
  @IsNumber()
  @Min(-100)
  @Max(999.99)
  markupPct?: number;

  @IsOptional()
  @IsArray()
  addOns?: ItineraryAddOnDto[];

  @IsOptional()
  @IsObject()
  details?: Record<string, unknown>;

  @IsOptional()
  @IsInt()
  sortOrder?: number;
}

export class UpdateItineraryPlanEventDto {
  @IsOptional()
  @IsEnum(ItineraryEventType)
  type?: ItineraryEventType;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  destination?: string;

  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsString()
  startTime?: string;

  @IsOptional()
  @IsString()
  endTime?: string;

  @IsOptional()
  @IsBoolean()
  showTime?: boolean;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  photoUrl?: string;

  @IsOptional()
  @IsEnum(TransportationType)
  transferType?: TransportationType;

  @IsOptional()
  @IsNumber()
  @Min(0)
  netAmount?: number;

  @IsOptional()
  @IsNumber()
  @Min(-100)
  @Max(999.99)
  markupPct?: number;

  @IsOptional()
  @IsArray()
  addOns?: ItineraryAddOnDto[];

  @IsOptional()
  @IsObject()
  details?: Record<string, unknown>;

  @IsOptional()
  @IsInt()
  sortOrder?: number;
}

export class UpsertItineraryPackageTermsDto {
  @IsOptional()
  @IsString()
  bookingAndPayment?: string;

  @IsOptional()
  @IsString()
  pricingAndInclusions?: string;

  @IsOptional()
  @IsString()
  cancellationsAndRefunds?: string;

  @IsOptional()
  @IsString()
  liability?: string;
}

export class CreateItineraryImageDto {
  @IsString()
  url!: string;

  @IsOptional()
  @IsString()
  caption?: string;

  @IsOptional()
  @IsInt()
  sortOrder?: number;
}

export class UpdateItineraryImageDto {
  @IsOptional()
  @IsString()
  caption?: string;

  @IsOptional()
  @IsInt()
  sortOrder?: number;
}

export class CreatePricingOptionDto {
  @IsOptional()
  @IsString()
  label?: string;

  @IsOptional()
  @IsInt()
  sortOrder?: number;
}

export class UpdatePricingOptionDto {
  @IsOptional()
  @IsString()
  label?: string;

  @IsOptional()
  @IsInt()
  sortOrder?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  accommodationEventIds?: string[];

  @IsOptional()
  @IsNumber()
  @Min(-100)
  @Max(999.99)
  baseMarkupPct?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  extraMarkupAmount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  cgstPct?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  sgstPct?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  igstPct?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  tcsPct?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  discountAmount?: number;
}

export class GenerateItineraryDraftDto {
  @IsArray()
  @IsString({ each: true })
  destinations!: string[];

  @IsDateString()
  startDate!: string;

  @IsDateString()
  endDate!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  adultsCount?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  childrenCount?: number;

  @IsOptional()
  @IsString()
  theme?: string;

  @IsOptional()
  @IsString()
  sightseeing?: string;

  @IsOptional()
  @IsString()
  hotel?: string;

  @IsOptional()
  @IsString()
  hotelCategory?: string;

  @IsOptional()
  @IsString()
  transport?: string;

  @IsOptional()
  @IsEnum(TransportationType)
  transportType?: TransportationType;

  @IsOptional()
  @IsString()
  mealPlan?: string;

  @IsOptional()
  @IsString()
  pickupCity?: string;

  @IsOptional()
  @IsString()
  budget?: string;

  @IsOptional()
  @IsString()
  freeText?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
