import { Module } from '@nestjs/common';
import { ItineraryEventTemplatesController } from './itinerary-event-templates.controller';
import { ItineraryEventTemplatesService } from './itinerary-event-templates.service';
import { PrismaService } from '../prisma.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [ItineraryEventTemplatesController],
  providers: [ItineraryEventTemplatesService, PrismaService],
})
export class ItineraryEventTemplatesModule {}
