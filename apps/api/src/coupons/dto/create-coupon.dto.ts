import { IsDateString, IsEnum, IsInt, IsNumber, IsOptional, IsPositive, IsString, Matches, Min } from 'class-validator';
import { CouponDiscountType } from '@prisma/client';

export class CreateCouponDto {
  @IsString()
  @Matches(/^[A-Z0-9_-]{3,20}$/, { message: 'Code must be 3-20 uppercase letters/numbers/hyphens/underscores' })
  code!: string;

  @IsEnum(CouponDiscountType)
  discountType!: CouponDiscountType;

  @IsNumber()
  @IsPositive()
  discountValue!: number;

  @IsDateString()
  validFrom!: string;

  @IsDateString()
  validTo!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  usageLimit?: number;
}
