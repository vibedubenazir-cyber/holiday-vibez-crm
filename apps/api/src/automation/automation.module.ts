import { Module } from '@nestjs/common';
import { AutomationController } from './automation.controller';
import { AutomationService } from './automation.service';
import { PrismaService } from '../prisma.service';
import { AuthModule } from '../auth/auth.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [AuthModule, NotificationsModule],
  controllers: [AutomationController],
  providers: [AutomationService, PrismaService],
  exports: [AutomationService],
})
export class AutomationModule {}
