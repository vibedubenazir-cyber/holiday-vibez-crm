import { IsString } from 'class-validator';

export class OpenDirectChannelDto {
  @IsString()
  userId!: string;
}
