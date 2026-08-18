import { FlightStatusCode } from '@prisma/client';
import { IsBoolean, IsEnum, IsISO8601, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateTripFlightDto {
  @IsString() @MaxLength(20) flightNumber!: string;

  @IsOptional() @IsString() @MaxLength(120) eventId?: string;
  @IsOptional() @IsString() @MaxLength(120) fromAirport?: string;
  @IsOptional() @IsString() @MaxLength(120) toAirport?: string;
  @IsOptional() @IsISO8601() scheduledDeparture?: string;
  @IsOptional() @IsISO8601() revisedDeparture?: string;
  @IsOptional() @IsEnum(FlightStatusCode) status?: FlightStatusCode;
  @IsOptional() @IsString() @MaxLength(20) terminal?: string;
  @IsOptional() @IsString() @MaxLength(20) gate?: string;
  @IsOptional() @IsString() @MaxLength(20) baggageBelt?: string;
  @IsOptional() @IsString() @MaxLength(400) note?: string;
}

export class UpdateTripFlightDto {
  @IsOptional() @IsString() @MaxLength(20) flightNumber?: string;
  @IsOptional() @IsString() @MaxLength(120) eventId?: string;
  @IsOptional() @IsString() @MaxLength(120) fromAirport?: string;
  @IsOptional() @IsString() @MaxLength(120) toAirport?: string;
  @IsOptional() @IsISO8601() scheduledDeparture?: string;
  @IsOptional() @IsISO8601() revisedDeparture?: string;
  @IsOptional() @IsEnum(FlightStatusCode) status?: FlightStatusCode;
  @IsOptional() @IsString() @MaxLength(20) terminal?: string;
  @IsOptional() @IsString() @MaxLength(20) gate?: string;
  @IsOptional() @IsString() @MaxLength(20) baggageBelt?: string;
  @IsOptional() @IsString() @MaxLength(400) note?: string;

  /**
   * Forces the WhatsApp even when nothing changed — for restating a situation
   * to travellers who may have missed the first message. Not persisted.
   */
  @IsOptional() @IsBoolean() notifyTraveller?: boolean;
}
