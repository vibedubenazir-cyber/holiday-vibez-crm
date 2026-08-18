import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CreateTripTransferDto, UpdateTripTransferDto } from './dto/trip-transfer.dto';
import { TripTransfersService } from './trip-transfers.service';

type AuthedRequest = { user: { id: string; role: Role; branchId: string | null } };

// Operations staff arrange the ground transport, so the same four roles that
// manage bookings manage transfers. Finance and Auditor are excluded — they
// have no reason to change a traveller's driver.
const OPS_ROLES = [Role.DIRECTOR, Role.ADMIN, Role.BRANCH_MANAGER, Role.TRAVEL_CONSULTANT];

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class TripTransfersController {
  constructor(private readonly transfers: TripTransfersService) {}

  @Roles(...OPS_ROLES)
  @Get('bookings/:bookingId/transfers')
  findAll(@Param('bookingId') bookingId: string, @Req() req: AuthedRequest) {
    return this.transfers.findAll(bookingId, req.user);
  }

  @Roles(...OPS_ROLES)
  @Post('bookings/:bookingId/transfers')
  create(
    @Param('bookingId') bookingId: string,
    @Body() dto: CreateTripTransferDto,
    @Req() req: AuthedRequest,
  ) {
    return this.transfers.create(bookingId, dto, req.user);
  }

  @Roles(...OPS_ROLES)
  @Patch('trip-transfers/:id')
  update(@Param('id') id: string, @Body() dto: UpdateTripTransferDto, @Req() req: AuthedRequest) {
    return this.transfers.update(id, dto, req.user);
  }

  @Roles(...OPS_ROLES)
  @Delete('trip-transfers/:id')
  remove(@Param('id') id: string, @Req() req: AuthedRequest) {
    return this.transfers.remove(id, req.user);
  }
}
