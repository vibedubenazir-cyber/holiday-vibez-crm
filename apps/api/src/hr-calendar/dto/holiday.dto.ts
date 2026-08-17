import { IsDateString, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateHolidayDto {
  @IsString()
  @MaxLength(120)
  name!: string;

  @IsDateString()
  date!: string;

  // Omit for an org-wide holiday; set to observe it in one branch only
  // (Onam in Kerala, Gudi Padwa in Maharashtra).
  @IsOptional()
  @IsString()
  branchId?: string;
}

export class UpdateHolidayDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @IsString()
  branchId?: string;
}
