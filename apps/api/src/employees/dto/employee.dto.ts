import { IsDateString, IsOptional, IsString } from 'class-validator';

export class UpdateEmployeeProfileDto {
  @IsOptional()
  @IsString()
  designation?: string;

  @IsOptional()
  @IsString()
  employeeCode?: string;

  @IsOptional()
  @IsDateString()
  dateOfJoining?: string;

  @IsOptional()
  @IsString()
  profilePhotoUrl?: string;

  @IsOptional()
  @IsString()
  emergencyContactName?: string;

  @IsOptional()
  @IsString()
  emergencyContactPhone?: string;

  @IsOptional()
  @IsString()
  reportsToId?: string;
}
