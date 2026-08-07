import { InvoiceType } from '@prisma/client';
import { IsEnum, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateInvoiceDto {
  @IsEnum(InvoiceType)
  type!: InvoiceType;

  @IsOptional()
  @IsNumber()
  amount?: number;

  // GST% applied to amount. If taxAmount is also passed explicitly, it wins —
  // gstRate is otherwise the source of truth for what taxAmount gets computed to.
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  gstRate?: number;

  @IsOptional()
  @IsNumber()
  taxAmount?: number;

  @IsOptional()
  @IsString()
  customerGstin?: string;

  @IsOptional()
  @IsString()
  pdfUrl?: string;
}
