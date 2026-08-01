import { TargetPeriod, TargetScope } from '@prisma/client';
import { IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateTargetDto {
  @IsEnum(TargetScope)
  scope!: TargetScope;

  @IsString()
  scopeId!: string;

  @IsEnum(TargetPeriod)
  period!: TargetPeriod;

  @IsNumber()
  revenueTarget!: number;

  @IsOptional()
  @IsNumber()
  bookingTarget?: number;

  // Required when scope=CONSULTANT, so branch-scoped leaderboards can group by branch too.
  @IsOptional()
  @IsString()
  branchId?: string;
}
