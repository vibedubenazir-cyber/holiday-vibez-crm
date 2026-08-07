import { ArrayNotEmpty, IsArray, IsString } from 'class-validator';

export class AddMembersDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  memberIds!: string[];
}
