import { IsArray, IsBoolean, IsDateString, IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

export class CreateShiftDto {
  @IsString() @MaxLength(80) name!: string;
  @Matches(HHMM, { message: 'startTime must be HH:mm' }) startTime!: string;
  @Matches(HHMM, { message: 'endTime must be HH:mm' }) endTime!: string;
  @IsOptional() @IsInt() @Min(0) @Max(120) graceMinutes?: number;
  @IsOptional() @IsString() branchId?: string;
}

export class UpdateShiftDto {
  @IsOptional() @IsString() @MaxLength(80) name?: string;
  @IsOptional() @Matches(HHMM) startTime?: string;
  @IsOptional() @Matches(HHMM) endTime?: string;
  @IsOptional() @IsInt() @Min(0) @Max(120) graceMinutes?: number;
  @IsOptional() @IsBoolean() active?: boolean;
}

export class RosterAssignmentDto {
  @IsString() userId!: string;
  @IsDateString() date!: string;
  @IsOptional() @IsString() shiftId?: string;
  @IsOptional() @IsBoolean() isWeekOff?: boolean;
}

// Publishing a week at a time is how rosters are actually built — one row at
// a time would mean 7x the clicks for every employee.
export class PublishRosterDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RosterAssignmentDto)
  assignments!: RosterAssignmentDto[];
}
