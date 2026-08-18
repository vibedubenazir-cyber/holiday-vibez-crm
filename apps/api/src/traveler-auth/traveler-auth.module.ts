import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { TravelerAuthController } from './traveler-auth.controller';
import { TravelerAuthGuard } from './traveler-auth.guard';
import { TravelerAuthService } from './traveler-auth.service';

@Module({
  imports: [NotificationsModule],
  controllers: [TravelerAuthController],
  providers: [TravelerAuthService, TravelerAuthGuard, PrismaService],
  // Exported so the traveller-app module can guard its routes with the same
  // session resolution rather than reimplementing it.
  exports: [TravelerAuthService, TravelerAuthGuard],
})
export class TravelerAuthModule {}
