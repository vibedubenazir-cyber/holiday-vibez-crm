import { AssignmentScope } from '@prisma/client';
import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';

export class CreateAssignmentDto {
  @IsString()
  courseId!: string;

  @IsEnum(AssignmentScope)
  scope!: AssignmentScope;

  // userId when scope=CONSULTANT, branchId when scope=BRANCH, a Role value (e.g. "TRAVEL_CONSULTANT") when scope=ROLE.
  @IsString()
  scopeId!: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
