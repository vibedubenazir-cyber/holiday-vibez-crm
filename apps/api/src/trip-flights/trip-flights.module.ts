import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { PrismaService } from '../prisma.service';
import { TripFlightsController } from './trip-flights.controller';
import { TripFlightsService } from './trip-flights.service';

@Module({
  imports: [AuthModule, NotificationsModule],
  controllers: [TripFlightsController],
  providers: [TripFlightsService, PrismaService],
  exports: [TripFlightsService],
})
export class TripFlightsModule {}
