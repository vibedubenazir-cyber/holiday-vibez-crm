import { Module } from '@nestjs/common';
import { DayItinerariesController } from './day-itineraries.controller';
import { DayItinerariesService } from './day-itineraries.service';
import { PrismaService } from '../prisma.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [DayItinerariesController],
  providers: [DayItinerariesService, PrismaService],
  exports: [DayItinerariesService],
})
export class DayItinerariesModule {}
