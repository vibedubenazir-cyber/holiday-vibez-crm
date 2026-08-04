import { AutomationTrigger, LeadStatus, NotificationChannel } from '@prisma/client';
import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateAutomationRuleDto {
  @IsString()
  name!: string;

  @IsEnum(AutomationTrigger)
  trigger!: AutomationTrigger;

  @IsOptional()
  @IsEnum(LeadStatus)
  targetLeadStatus?: LeadStatus;

  @IsOptional()
  @IsInt()
  @Min(0)
  delayMinutes?: number;

  @IsEnum(NotificationChannel)
  channel!: NotificationChannel;

  @IsOptional()
  @IsString()
  templateId?: string;
}

export class UpdateAutomationRuleDto {
  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  delayMinutes?: number;
}
