import { ArrayNotEmpty, IsArray, IsInt, IsOptional, IsString, Max, Min, MinLength } from 'class-validator';

// Segment: clients whose last trip departed between monthsAgoMin and
// monthsAgoMax months ago (e.g. 3–5 for the "~4 months" default), optionally
// filtered by where they went.
export class ReengagementPreviewDto {
  @IsInt()
  @Min(0)
  @Max(60)
  monthsAgoMin!: number;

  @IsInt()
  @Min(1)
  @Max(120)
  monthsAgoMax!: number;

  @IsOptional()
  @IsString()
  pastDestination?: string;
}

export class ReengagementSendDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  leadIds!: string[];

  // Supports {{name}}, {{pastDestination}}, {{newDestination}}.
  @IsString()
  @MinLength(1)
  messageBody!: string;

  @IsOptional()
  @IsString()
  newDestination?: string;
}
