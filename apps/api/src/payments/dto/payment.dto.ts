import { PaymentType } from '@prisma/client';
import { IsDateString, IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreatePaymentDto {
  @IsString()
  bookingId!: string;

  @IsEnum(PaymentType)
  type!: PaymentType;

  @IsNumber()
  amount!: number;

  @IsOptional()
  @IsDateString()
  dueDate?: string;
}
