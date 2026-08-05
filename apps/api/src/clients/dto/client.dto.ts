import { ClientType } from '@prisma/client';
import { IsBoolean, IsEmail, IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateClientDto {
  @IsString()
  name!: string;

  @IsEnum(ClientType)
  type!: ClientType;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  gstNumber?: string;

  @IsOptional()
  @IsNumber()
  commissionPct?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateClientDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEnum(ClientType)
  type?: ClientType;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  gstNumber?: string;

  @IsOptional()
  @IsNumber()
  commissionPct?: number;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
