import { Module } from '@nestjs/common';
import { LmsController } from './lms.controller';
import { LmsService } from './lms.service';
import { PrismaService } from '../prisma.service';
import { AuthModule } from '../auth/auth.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [AuthModule, NotificationsModule],
  controllers: [LmsController],
  providers: [LmsService, PrismaService],
  exports: [LmsService],
})
export class LmsModule {}
