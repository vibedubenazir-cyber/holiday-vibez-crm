import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { PrismaService } from '../prisma.service';
import { TripTransfersController } from './trip-transfers.controller';
import { TripTransfersService } from './trip-transfers.service';

@Module({
  imports: [AuthModule, NotificationsModule],
  controllers: [TripTransfersController],
  providers: [TripTransfersService, PrismaService],
})
export class TripTransfersModule {}
