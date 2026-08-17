import { IsArray, IsDateString, IsInt, IsOptional, IsString, Max, MaxLength, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateCycleDto {
  @IsString() @MaxLength(120) name!: string;
  @IsDateString() startDate!: string;
  @IsDateString() endDate!: string;
}

export class GoalInputDto {
  @IsString() @MaxLength(200) title!: string;
  @IsOptional() @IsInt() @Min(0) @Max(100) weightPct?: number;
}

export class EnrolDto {
  @IsArray() @IsString({ each: true }) userIds!: string[];
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => GoalInputDto) goals?: GoalInputDto[];
}

export class GoalRatingDto {
  @IsString() goalId!: string;
  @IsInt() @Min(1) @Max(5) rating!: number;
  @IsOptional() @IsString() @MaxLength(500) comments?: string;
}

export class SubmitSelfReviewDto {
  @IsOptional() @IsString() @MaxLength(2000) selfComments?: string;
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => GoalRatingDto) ratings?: GoalRatingDto[];
}

export class SubmitManagerReviewDto {
  @IsOptional() @IsString() @MaxLength(2000) managerComments?: string;
  @IsInt() @Min(1) @Max(5) finalRating!: number;
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => GoalRatingDto) ratings?: GoalRatingDto[];
}
