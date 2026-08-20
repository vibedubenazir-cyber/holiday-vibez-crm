import { ClientType, LeadService, LeadSource, LeadStatus, LeadTemperature } from '@prisma/client';
import { IsBoolean, IsDateString, IsEmail, IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { IsPhoneWithCountryCode } from '../../common/validators/phone.validator';

class TravelRequirementFields {
  // These fields are nullable, not just optional: the Travel Requirement edit
  // form re-sends the whole form on every save, and `null` is how it clears a
  // previously-set value — `undefined` (omitted) means "leave unchanged", so
  // the two need to stay distinguishable all the way to the Prisma update.
  @IsOptional()
  @IsDateString()
  travelDate?: string | null;

  @IsOptional()
  @IsDateString()
  travelEndDate?: string | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  adultsCount?: number | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  childrenCount?: number | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  infantsCount?: number | null;

  @IsOptional()
  @IsString()
  childrenAges?: string | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  hotelCategory?: number | null;

  @IsOptional()
  @IsString()
  mealPreference?: string | null;

  @IsOptional()
  @IsBoolean()
  transportRequired?: boolean;

  @IsOptional()
  @IsBoolean()
  visaRequired?: boolean;

  @IsOptional()
  @IsBoolean()
  flightRequired?: boolean;

  @IsOptional()
  @IsBoolean()
  insuranceRequired?: boolean;

  @IsOptional()
  @IsEnum(LeadService)
  service?: LeadService | null;
}

export class CreateLeadDto extends TravelRequirementFields {
  @IsEnum(LeadSource)
  source!: LeadSource;

  @IsOptional()
  @IsString()
  utmCampaign?: string;

  @IsOptional()
  @IsEnum(ClientType)
  contactType?: ClientType;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsEnum(LeadTemperature)
  temperature?: LeadTemperature;

  // Optional explicit consultant to assign at creation, overriding the
  // default round-robin — must belong to the target branch (validated in
  // the service, same rule reassign() already enforces).
  @IsOptional()
  @IsString()
  assignedConsultantId?: string;

  @IsString()
  clientName!: string;

  // Optional link to a Client business-entity record (agent/corporate/group).
  @IsOptional()
  @IsString()
  clientId?: string;

  @IsString()
  @IsPhoneWithCountryCode()
  phone!: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsString()
  destination!: string;

  @IsString()
  branchId!: string;
}

export class UpdateLeadDto extends TravelRequirementFields {
  @IsOptional()
  @IsEnum(LeadStatus)
  status?: LeadStatus;

  @IsOptional()
  @IsEnum(LeadTemperature)
  temperature?: LeadTemperature;

  @IsOptional()
  @IsString()
  destination?: string;

  // Short reason tied to the current status (e.g. "Follow Up: Number
  // Busy"). null clears it back to no reason.
  @IsOptional()
  @IsString()
  statusNote?: string | null;
}

// Used by the public website lead-capture endpoint (Section 10) — branch is
// resolved server-side (round-robin across all branches) rather than trusted from the client.
export class PublicCreateLeadDto extends TravelRequirementFields {
  @IsEnum(LeadSource)
  source!: LeadSource;

  @IsOptional()
  @IsString()
  utmCampaign?: string;

  @IsString()
  clientName!: string;

  @IsString()
  @IsPhoneWithCountryCode()
  phone!: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsString()
  destination!: string;
}
