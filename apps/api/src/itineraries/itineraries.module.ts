import { Module } from '@nestjs/common';
import { ItinerariesController } from './itineraries.controller';
import { ItinerariesService } from './itineraries.service';
import { PublicItineraryController, PublicWebsitePackagesController } from './public-itinerary.controller';
import { PrismaService } from '../prisma.service';
import { AuthModule } from '../auth/auth.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [AuthModule, NotificationsModule],
  controllers: [ItinerariesController, PublicItineraryController, PublicWebsitePackagesController],
  providers: [ItinerariesService, PrismaService],
})
export class ItinerariesModule {}
