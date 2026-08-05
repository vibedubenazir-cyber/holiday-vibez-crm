import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class CreateDayItineraryDto {
  @IsString()
  title!: string;

  @IsString()
  detail!: string;
}

export class UpdateDayItineraryDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  detail?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
