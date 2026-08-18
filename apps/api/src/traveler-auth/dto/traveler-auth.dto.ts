import { IsString, Length, MaxLength, MinLength } from 'class-validator';

export class RequestOtpDto {
  // Deliberately one field rather than separate phone/email inputs — the
  // traveller shouldn't have to remember which one the consultant recorded.
  @IsString()
  @MinLength(3)
  @MaxLength(120)
  identifier!: string;
}

export class VerifyOtpDto {
  @IsString()
  @MinLength(3)
  @MaxLength(120)
  identifier!: string;

  @IsString()
  @Length(6, 6)
  code!: string;
}
