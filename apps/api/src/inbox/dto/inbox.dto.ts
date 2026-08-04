import { NotificationChannel } from '@prisma/client';
import { IsBoolean, IsEnum, IsString, MinLength } from 'class-validator';

export class EnsureConversationDto {
  @IsEnum(NotificationChannel)
  channel!: NotificationChannel;
}

export class SendMessageDto {
  @IsString()
  @MinLength(1)
  body!: string;
}

export class SimulateInboundDto {
  @IsString()
  @MinLength(1)
  body!: string;
}

export class UpdateConversationDto {
  @IsBoolean()
  botEnabled!: boolean;
}
