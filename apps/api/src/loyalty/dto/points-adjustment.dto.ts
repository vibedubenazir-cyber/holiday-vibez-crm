import { IsInt, IsOptional, IsPositive, IsString } from 'class-validator';

export class PointsAdjustmentDto {
  @IsInt()
  @IsPositive()
  points!: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  bookingId?: string;
}
