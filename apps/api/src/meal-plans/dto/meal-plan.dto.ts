import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class CreateMealPlanDto {
  @IsString()
  name!: string;
}

export class UpdateMealPlanDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
