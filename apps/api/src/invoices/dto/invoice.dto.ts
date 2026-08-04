import { InvoiceType } from '@prisma/client';
import { IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateInvoiceDto {
  @IsEnum(InvoiceType)
  type!: InvoiceType;

  @IsOptional()
  @IsNumber()
  amount?: number;

  @IsOptional()
  @IsNumber()
  taxAmount?: number;

  @IsOptional()
  @IsString()
  pdfUrl?: string;
}
