import { IsNumber, IsOptional, Min } from 'class-validator';

export class UpsertSalaryStructureDto {
  @IsNumber()
  @Min(0)
  basicSalary!: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  hra?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  allowances?: number;
}
