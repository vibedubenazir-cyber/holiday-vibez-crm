import { IsNumber, IsOptional } from 'class-validator';

export class PunchDto {
  @IsOptional()
  @IsNumber()
  lat?: number;

  @IsOptional()
  @IsNumber()
  lng?: number;
}
