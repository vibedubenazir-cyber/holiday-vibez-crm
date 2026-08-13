import { IsDateString, IsOptional, IsString } from 'class-validator';

export class CreateExitRecordDto {
  @IsDateString()
  noticeDate!: string;

  @IsDateString()
  lastWorkingDate!: string;

  @IsString()
  reason!: string;
}

export class ClearExitRecordDto {
  @IsOptional()
  @IsString()
  exitInterviewNotes?: string;
}
