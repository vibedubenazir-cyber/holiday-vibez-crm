import { IsDateString, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { AssetType } from '@prisma/client';

export class CreateAssetDto {
  @IsString() @MaxLength(60) assetTag!: string;
  @IsEnum(AssetType) type!: AssetType;
  @IsString() @MaxLength(160) name!: string;
  @IsOptional() @IsString() @MaxLength(120) serialNumber?: string;
  @IsOptional() @IsDateString() purchaseDate?: string;
  @IsOptional() @IsString() branchId?: string;
  @IsOptional() @IsString() @MaxLength(500) notes?: string;
}

export class UpdateAssetDto {
  @IsOptional() @IsEnum(AssetType) type?: AssetType;
  @IsOptional() @IsString() @MaxLength(160) name?: string;
  @IsOptional() @IsString() @MaxLength(120) serialNumber?: string;
  @IsOptional() @IsDateString() purchaseDate?: string;
  @IsOptional() @IsString() branchId?: string;
  @IsOptional() @IsString() @MaxLength(500) notes?: string;
}

export class AssignAssetDto {
  @IsString() userId!: string;
}
