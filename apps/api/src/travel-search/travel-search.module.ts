import { Module } from '@nestjs/common';
import { TravelSearchController } from './travel-search.controller';
import { HotelSearchService } from './hotel-search.service';
import { FlightSearchService } from './flight-search.service';
import { TravelSearchAddService } from './travel-search.service';
import { PrismaService } from '../prisma.service';
import { AuthModule } from '../auth/auth.module';
import { QuotationsModule } from '../quotations/quotations.module';

@Module({
  imports: [AuthModule, QuotationsModule],
  controllers: [TravelSearchController],
  providers: [HotelSearchService, FlightSearchService, TravelSearchAddService, PrismaService],
})
export class TravelSearchModule {}
