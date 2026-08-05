import { Module } from '@nestjs/common';
import { InboxController } from './inbox.controller';
import { WhatsappWebhookController } from './whatsapp-webhook.controller';
import { InboxService } from './inbox.service';
import { PrismaService } from '../prisma.service';
import { AuthModule } from '../auth/auth.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [AuthModule, NotificationsModule],
  controllers: [InboxController, WhatsappWebhookController],
  providers: [InboxService, PrismaService],
  exports: [InboxService],
})
export class InboxModule {}
