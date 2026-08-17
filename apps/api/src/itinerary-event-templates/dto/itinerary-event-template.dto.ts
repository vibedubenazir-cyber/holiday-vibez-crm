import { ItineraryEventType } from '@prisma/client';
import { IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';

export class CreateItineraryEventTemplateDto {
  @IsEnum(ItineraryEventType)
  type!: ItineraryEventType;

  @IsString()
  destination!: string;

  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  photoUrl?: string;
}

export class UpdateItineraryEventTemplateDto {
  @IsOptional()
  @IsEnum(ItineraryEventType)
  type?: ItineraryEventType;

  @IsOptional()
  @IsString()
  destination?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  photoUrl?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
