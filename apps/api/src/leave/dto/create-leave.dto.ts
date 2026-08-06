import { IsDateString, IsIn, IsOptional, IsString } from 'class-validator';

export class CreateLeaveDto {
  @IsIn(['SICK', 'CASUAL', 'ANNUAL', 'UNPAID'])
  type!: 'SICK' | 'CASUAL' | 'ANNUAL' | 'UNPAID';

  @IsDateString()
  startDate!: string;

  @IsDateString()
  endDate!: string;

  @IsOptional()
  @IsString()
  reason?: string;
}
