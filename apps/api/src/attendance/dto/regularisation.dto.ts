import { IsDateString, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateRegularisationDto {
  @IsDateString()
  date!: string;

  @IsOptional()
  @IsDateString()
  requestedCheckInAt?: string;

  @IsOptional()
  @IsDateString()
  requestedCheckOutAt?: string;

  // Required and non-trivial: an approver reviewing a missed punch needs to
  // know *why*, and a blank reason makes the audit trail worthless.
  @IsString()
  @MinLength(5)
  @MaxLength(500)
  reason!: string;
}

export class ReviewRegularisationDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reviewComment?: string;
}
