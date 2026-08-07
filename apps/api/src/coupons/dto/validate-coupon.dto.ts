import { IsNumber, IsPositive, IsString } from 'class-validator';

export class ValidateCouponDto {
  @IsString()
  code!: string;

  @IsNumber()
  @IsPositive()
  amount!: number;
}
