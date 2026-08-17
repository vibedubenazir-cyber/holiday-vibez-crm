import { IsDateString, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { EmployeeDocumentType } from '@prisma/client';

export class CreateEmployeeDocumentDto {
  @IsString() userId!: string;
  @IsEnum(EmployeeDocumentType) type!: EmployeeDocumentType;
  @IsString() @MaxLength(160) title!: string;
  @IsString() fileUrl!: string;
  @IsOptional() @IsString() @MaxLength(60) number?: string;
  @IsOptional() @IsDateString() issuedOn?: string;
  @IsOptional() @IsDateString() expiresOn?: string;
}
