import { PerformanceRating } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class CreatePerformanceReviewDto {
  @IsString()
  userId!: string;

  @IsString()
  period!: string;

  @IsOptional()
  @IsEnum(PerformanceRating)
  rating?: PerformanceRating;

  @IsOptional()
  @IsString()
  strengths?: string;

  @IsOptional()
  @IsString()
  improvements?: string;

  @IsOptional()
  @IsString()
  goals?: string;
}

export class UpdatePerformanceReviewDto {
  @IsOptional()
  @IsEnum(PerformanceRating)
  rating?: PerformanceRating;

  @IsOptional()
  @IsString()
  strengths?: string;

  @IsOptional()
  @IsString()
  improvements?: string;

  @IsOptional()
  @IsString()
  goals?: string;
}
