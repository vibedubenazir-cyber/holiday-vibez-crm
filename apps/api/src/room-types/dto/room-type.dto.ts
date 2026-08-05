import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class CreateRoomTypeDto {
  @IsString()
  name!: string;
}

export class UpdateRoomTypeDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
