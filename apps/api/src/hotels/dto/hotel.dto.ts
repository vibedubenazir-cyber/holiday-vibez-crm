import { IsBoolean, IsInt, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateHotelDto {
  @IsString()
  name!: string;

  @IsInt()
  @Min(1)
  @Max(7)
  category!: number;

  @IsString()
  destination!: string;

  @IsNumber()
  @Min(0)
  price!: number;
}

export class UpdateHotelDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(7)
  category?: number;

  @IsOptional()
  @IsString()
  destination?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
