import { LeadSource, LeadStatus } from '@prisma/client';
import { IsEmail, IsEnum, IsOptional, IsString } from 'class-validator';

export class CreateLeadDto {
  @IsEnum(LeadSource)
  source!: LeadSource;

  @IsOptional()
  @IsString()
  utmCampaign?: string;

  @IsString()
  clientName!: string;

  // Optional link to a Client business-entity record (agent/corporate/group).
  @IsOptional()
  @IsString()
  clientId?: string;

  @IsString()
  phone!: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsString()
  destination!: string;

  @IsString()
  branchId!: string;
}

export class UpdateLeadDto {
  @IsOptional()
  @IsEnum(LeadStatus)
  status?: LeadStatus;

  @IsOptional()
  @IsString()
  destination?: string;
}

// Used by the public website lead-capture endpoint (Section 10) — branch is
// resolved server-side (round-robin across all branches) rather than trusted from the client.
export class PublicCreateLeadDto {
  @IsEnum(LeadSource)
  source!: LeadSource;

  @IsOptional()
  @IsString()
  utmCampaign?: string;

  @IsString()
  clientName!: string;

  @IsString()
  phone!: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsString()
  destination!: string;
}
