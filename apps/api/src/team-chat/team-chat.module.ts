import { Module } from '@nestjs/common';
import { TeamChatController } from './team-chat.controller';
import { TeamChatService } from './team-chat.service';
import { PresenceService } from './presence.service';
import { PrismaService } from '../prisma.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [TeamChatController],
  providers: [TeamChatService, PresenceService, PrismaService],
})
export class TeamChatModule {}
