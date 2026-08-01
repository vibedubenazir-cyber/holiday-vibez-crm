import { IsDateString, IsOptional, IsString } from 'class-validator';

export class CreateBookingDto {
  @IsString()
  quotationId!: string;

  @IsDateString()
  departureDate!: string;

  @IsOptional()
  @IsDateString()
  returnDate?: string;
}
