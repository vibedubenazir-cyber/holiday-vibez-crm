import { PaymentCategory, PaymentType } from '@prisma/client';
import { IsDateString, IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreatePaymentDto {
  @IsString()
  bookingId!: string;

  @IsEnum(PaymentType)
  type!: PaymentType;

  // Cost category (DMC/Flight/Hotel/Activity/Other) — only meaningful on
  // outbound payments; left undefined on CLIENT_RECEIPT rows.
  @IsOptional()
  @IsEnum(PaymentCategory)
  category?: PaymentCategory;

  @IsNumber()
  amount!: number;

  @IsOptional()
  @IsDateString()
  dueDate?: string;
}
