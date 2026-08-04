import { VoucherType } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class CreateVoucherDto {
  @IsEnum(VoucherType)
  type!: VoucherType;

  @IsOptional()
  @IsString()
  pdfUrl?: string;
}
