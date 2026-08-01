import { IsDateString, IsOptional, IsString } from 'class-validator';

export class CreateTravelerDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  passportNumber?: string;

  @IsOptional()
  @IsDateString()
  passportExpiry?: string;

  @IsOptional()
  @IsString()
  visaStatus?: string;

  @IsOptional()
  @IsString()
  insurancePolicyNo?: string;
}
