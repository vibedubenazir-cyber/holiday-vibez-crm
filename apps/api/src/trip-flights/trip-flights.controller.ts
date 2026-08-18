import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CreateTripFlightDto, UpdateTripFlightDto } from './dto/trip-flight.dto';
import { TripFlightsService } from './trip-flights.service';

type AuthedRequest = { user: { id: string; role: Role; branchId: string | null } };

// Same four roles that manage the booking itself. Finance and Auditor are out:
// they have no reason to change a traveller's gate.
const OPS_ROLES = [Role.DIRECTOR, Role.ADMIN, Role.BRANCH_MANAGER, Role.TRAVEL_CONSULTANT];

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class TripFlightsController {
  constructor(private readonly flights: TripFlightsService) {}

  @Roles(...OPS_ROLES)
  @Get('bookings/:bookingId/flights')
  findAll(@Param('bookingId') bookingId: string, @Req() req: AuthedRequest) {
    return this.flights.findAll(bookingId, req.user);
  }

  @Roles(...OPS_ROLES)
  @Post('bookings/:bookingId/flights')
  create(@Param('bookingId') bookingId: string, @Body() dto: CreateTripFlightDto, @Req() req: AuthedRequest) {
    return this.flights.create(bookingId, dto, req.user);
  }

  @Roles(...OPS_ROLES)
  @Patch('trip-flights/:id')
  update(@Param('id') id: string, @Body() dto: UpdateTripFlightDto, @Req() req: AuthedRequest) {
    return this.flights.update(id, dto, req.user);
  }

  @Roles(...OPS_ROLES)
  @Delete('trip-flights/:id')
  remove(@Param('id') id: string, @Req() req: AuthedRequest) {
    return this.flights.remove(id, req.user);
  }
}
