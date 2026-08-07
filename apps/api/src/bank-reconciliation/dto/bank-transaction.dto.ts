import { BankTransactionType } from '@prisma/client';
import { IsDateString, IsEnum, IsNumber, IsOptional, IsPositive, IsString } from 'class-validator';

export class CreateBankTransactionDto {
  @IsOptional()
  @IsString()
  branchId?: string;

  @IsDateString()
  transactionDate!: string;

  @IsString()
  description!: string;

  @IsNumber()
  @IsPositive()
  amount!: number;

  @IsEnum(BankTransactionType)
  type!: BankTransactionType;
}

export class MatchBankTransactionDto {
  @IsString()
  paymentId!: string;
}
