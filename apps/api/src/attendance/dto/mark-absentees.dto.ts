import { IsDateString, IsOptional } from 'class-validator';

export class MarkAbsenteesDto {
  // The day to sweep, as YYYY-MM-DD. Omit to default to yesterday.
  @IsOptional()
  @IsDateString()
  date?: string;
}
