import { IsArray, IsDateString, IsOptional, IsString, MaxLength, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class OnboardingTaskItemDto {
  @IsString() @MaxLength(160) title!: string;
  @IsOptional() @IsString() @MaxLength(500) description?: string;
  @IsOptional() @IsDateString() dueDate?: string;
}

export class CreateOnboardingDto {
  @IsString() userId!: string;

  // Omit to seed the standard joining checklist.
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OnboardingTaskItemDto)
  tasks?: OnboardingTaskItemDto[];
}

export class AddOnboardingTaskDto extends OnboardingTaskItemDto {
  @IsString() userId!: string;
}
