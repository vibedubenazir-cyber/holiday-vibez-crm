import { NotificationChannel } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class CreateTemplateDto {
  @IsEnum(NotificationChannel)
  channel!: NotificationChannel;

  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  subject?: string;

  @IsString()
  body!: string;
}

export class UpdateTemplateDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  subject?: string;

  @IsOptional()
  @IsString()
  body?: string;
}
