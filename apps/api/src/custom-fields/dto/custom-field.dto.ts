import { CustomFieldType } from '@prisma/client';
import { ArrayMaxSize, IsArray, IsBoolean, IsEnum, IsIn, IsInt, IsOptional, IsString } from 'class-validator';

const ENTITY_TYPES = ['LEAD', 'TRAVELER', 'BOOKING'];

export class CreateCustomFieldDefinitionDto {
  @IsIn(ENTITY_TYPES)
  entityType!: string;

  @IsString()
  label!: string;

  @IsString()
  fieldKey!: string;

  @IsEnum(CustomFieldType)
  fieldType!: CustomFieldType;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  options?: string[];

  @IsOptional()
  @IsBoolean()
  required?: boolean;

  @IsOptional()
  @IsInt()
  sortOrder?: number;
}

export class UpdateCustomFieldDefinitionDto {
  @IsOptional()
  @IsString()
  label?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  options?: string[];

  @IsOptional()
  @IsBoolean()
  required?: boolean;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class CustomFieldValueInput {
  @IsString()
  definitionId!: string;

  @IsString()
  value!: string;
}

export class UpsertCustomFieldValuesDto {
  @IsIn(ENTITY_TYPES)
  entityType!: string;

  @IsString()
  entityId!: string;

  @IsArray()
  values!: CustomFieldValueInput[];
}
