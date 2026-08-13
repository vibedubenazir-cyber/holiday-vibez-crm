import { GrievanceCategory, GrievanceStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class CreateGrievanceDto {
  @IsEnum(GrievanceCategory)
  category!: GrievanceCategory;

  @IsString()
  description!: string;

  @IsOptional()
  @IsString()
  against?: string;
}

export class UpdateGrievanceDto {
  @IsOptional()
  @IsEnum(GrievanceStatus)
  status?: GrievanceStatus;

  @IsOptional()
  @IsString()
  resolutionNotes?: string;
}
