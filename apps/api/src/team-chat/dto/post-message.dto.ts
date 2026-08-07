import { IsInt, IsOptional, IsPositive, IsString, ValidateIf } from 'class-validator';

export class PostMessageDto {
  @ValidateIf((o) => !o.fileUrl)
  @IsString()
  body?: string;

  @IsOptional()
  @IsString()
  fileUrl?: string;

  @IsOptional()
  @IsString()
  fileName?: string;

  @IsOptional()
  @IsInt()
  @IsPositive()
  fileSize?: number;
}
