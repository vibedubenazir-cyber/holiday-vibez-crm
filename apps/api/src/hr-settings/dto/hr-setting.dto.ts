import { IsString } from 'class-validator';

export class UpsertHrSettingDto {
  @IsString()
  key!: string;

  @IsString()
  value!: string;
}
