import { IsNumber, IsOptional, IsString, Matches, Min } from 'class-validator';

export class GeneratePayslipDto {
  @IsString()
  userId!: string;

  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/, { message: 'month must be in YYYY-MM format' })
  month!: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  incentive?: number;
}
