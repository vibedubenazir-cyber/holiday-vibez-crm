import { IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateBranchDto {
  @IsString()
  name!: string;

  @IsString()
  city!: string;

  @IsOptional()
  @IsNumber()
  monthlyTarget?: number;

  @IsOptional()
  @IsNumber()
  quarterlyTarget?: number;
}

export class UpdateBranchDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  managerId?: string;

  @IsOptional()
  @IsNumber()
  monthlyTarget?: number;

  @IsOptional()
  @IsNumber()
  quarterlyTarget?: number;
}
