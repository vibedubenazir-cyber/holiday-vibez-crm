import { LeadStatus, NotificationChannel } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class CreateCampaignDto {
  @IsString()
  name!: string;

  @IsEnum(NotificationChannel)
  channel!: NotificationChannel;

  @IsOptional()
  @IsString()
  templateId?: string;

  @IsOptional()
  @IsString()
  audienceBranchId?: string;

  @IsOptional()
  @IsEnum(LeadStatus)
  audienceLeadStatus?: LeadStatus;
}
