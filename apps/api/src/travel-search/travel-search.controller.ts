import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { HotelSearchService } from './hotel-search.service';
import { FlightSearchService } from './flight-search.service';
import { TransferSearchService } from './transfer-search.service';
import { TravelSearchAddService } from './travel-search.service';
import {
  AddSearchResultToQuotationDto,
  SearchFlightsQueryDto,
  SearchHotelsQueryDto,
  SearchTransfersQueryDto,
} from './dto/travel-search.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

const ALL_ROLES = [Role.DIRECTOR, Role.ADMIN, Role.BRANCH_MANAGER, Role.TRAVEL_CONSULTANT];

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('travel-search')
export class TravelSearchController {
  constructor(
    private readonly hotelSearchService: HotelSearchService,
    private readonly flightSearchService: FlightSearchService,
    private readonly transferSearchService: TransferSearchService,
    private readonly travelSearchAddService: TravelSearchAddService,
  ) {}

  @Roles(...ALL_ROLES)
  @Get('hotels')
  searchHotels(@Query() query: SearchHotelsQueryDto) {
    return this.hotelSearchService.search(query);
  }

  @Roles(...ALL_ROLES)
  @Get('flights')
  searchFlights(@Query() query: SearchFlightsQueryDto) {
    return this.flightSearchService.search(query);
  }

  @Roles(...ALL_ROLES)
  @Get('transfers')
  searchTransfers(@Query() query: SearchTransfersQueryDto) {
    return this.transferSearchService.search(query);
  }

  // Same role gate as QuotationsController's own item-add endpoint — this is just
  // an alternate entry point into that identical action.
  @Roles(Role.TRAVEL_CONSULTANT, Role.ADMIN)
  @Post('add-to-quotation')
  addToQuotation(@Body() dto: AddSearchResultToQuotationDto, @CurrentUser() user: { id: string; role: Role; branchId: string | null }) {
    return this.travelSearchAddService.addToQuotation(dto, user);
  }
}
