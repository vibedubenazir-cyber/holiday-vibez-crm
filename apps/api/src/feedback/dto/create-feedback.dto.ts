import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateFeedbackDto {
  @IsInt()
  @Min(1)
  @Max(5)
  overallSatisfaction!: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  hotelRating?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  transportRating?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  guideRating?: number;

  @IsOptional()
  @IsString()
  comments?: string;
}
