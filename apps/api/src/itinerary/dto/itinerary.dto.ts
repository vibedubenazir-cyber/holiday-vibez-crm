import { RoomCategory, TransportationType, ItineraryNoteType } from '@prisma/client';
import { IsDateString, IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class UpsertItineraryTermsDto {
  @IsOptional()
  @IsString()
  bookingPaymentTerms?: string;

  @IsOptional()
  @IsString()
  pricingTerms?: string;

  @IsOptional()
  @IsString()
  inclusionsExclusions?: string;

  @IsOptional()
  @IsString()
  cancellationRefundPolicy?: string;

  @IsOptional()
  @IsString()
  importantInstructions?: string;
}

export class CreateItineraryDayDto {
  @IsInt()
  @Min(1)
  dayNumber!: number;

  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @IsString()
  title?: string;
}

export class UpdateItineraryDayDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  dayNumber?: number;

  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @IsString()
  title?: string;
}

export class CreateAccommodationDto {
  @IsString()
  hotelName!: string;

  @IsString()
  city!: string;

  @IsDateString()
  checkInDate!: string;

  @IsDateString()
  checkOutDate!: string;

  @IsInt()
  @Min(1)
  nights!: number;

  @IsEnum(RoomCategory)
  roomCategory!: RoomCategory;

  @IsInt()
  @Min(1)
  numberOfRooms!: number;

  @IsOptional()
  @IsString()
  checkInTime?: string;

  @IsOptional()
  @IsString()
  checkOutTime?: string;

  @IsOptional()
  @IsString()
  description?: string;
}

export class CreateActivityDto {
  @IsString()
  destination!: string;

  @IsString()
  activityName!: string;

  @IsOptional()
  @IsString()
  description?: string;
}

export class CreateTransportationDto {
  @IsEnum(TransportationType)
  type!: TransportationType;

  @IsOptional()
  @IsString()
  description?: string;
}

export class CreateItineraryNoteDto {
  @IsEnum(ItineraryNoteType)
  type!: ItineraryNoteType;

  @IsOptional()
  @IsString()
  description?: string;
}
