import { TripTransferType } from '@prisma/client';
import { IsEnum, IsISO8601, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateTripTransferDto {
  @IsEnum(TripTransferType)
  type!: TripTransferType;

  @IsOptional()
  @IsISO8601()
  scheduledAt?: string;

  @IsOptional() @IsString() @MaxLength(200) fromLocation?: string;
  @IsOptional() @IsString() @MaxLength(200) toLocation?: string;
  @IsOptional() @IsString() @MaxLength(120) driverName?: string;
  @IsOptional() @IsString() @MaxLength(40) driverPhone?: string;
  @IsOptional() @IsString() @MaxLength(40) vehicleNumber?: string;
  @IsOptional() @IsString() @MaxLength(80) vehicleType?: string;
  @IsOptional() @IsString() @MaxLength(500) notes?: string;
}

export class UpdateTripTransferDto {
  @IsOptional()
  @IsEnum(TripTransferType)
  type?: TripTransferType;

  @IsOptional()
  @IsISO8601()
  scheduledAt?: string;

  @IsOptional() @IsString() @MaxLength(200) fromLocation?: string;
  @IsOptional() @IsString() @MaxLength(200) toLocation?: string;
  @IsOptional() @IsString() @MaxLength(120) driverName?: string;
  @IsOptional() @IsString() @MaxLength(40) driverPhone?: string;
  @IsOptional() @IsString() @MaxLength(40) vehicleNumber?: string;
  @IsOptional() @IsString() @MaxLength(80) vehicleType?: string;
  @IsOptional() @IsString() @MaxLength(500) notes?: string;

  /**
   * Staff-written explanation sent verbatim to the traveller, e.g. "Your
   * driver is running 40 minutes late due to traffic". Not persisted — the
   * transfer row holds the new facts, this holds the reason for the change.
   */
  @IsOptional() @IsString() @MaxLength(300) changeReason?: string;
}
