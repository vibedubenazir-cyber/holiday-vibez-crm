import { ArrayNotEmpty, IsArray, IsString } from 'class-validator';

export class CreateGroupChannelDto {
  @IsString()
  name!: string;

  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  memberIds!: string[];
}
