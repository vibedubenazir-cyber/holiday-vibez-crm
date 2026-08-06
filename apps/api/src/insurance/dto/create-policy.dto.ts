import { IsDateString, IsNumber, IsPositive, IsString } from 'class-validator';

export class CreatePolicyDto {
  @IsString()
  provider!: string;

  @IsString()
  policyNumber!: string;

  @IsNumber()
  @IsPositive()
  premiumAmount!: number;

  @IsNumber()
  @IsPositive()
  coverageAmount!: number;

  @IsDateString()
  startDate!: string;

  @IsDateString()
  endDate!: string;
}
