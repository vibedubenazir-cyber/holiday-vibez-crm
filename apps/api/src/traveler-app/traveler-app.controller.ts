import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { TravelerAuthGuard } from '../traveler-auth/traveler-auth.guard';
import { TravelerAppService } from './traveler-app.service';

@UseGuards(TravelerAuthGuard)
@Controller('traveler')
export class TravelerAppController {
  constructor(private readonly travelerApp: TravelerAppService) {}

  /**
   * The whole trip in one payload. Note the session comes off the request
   * (set by TravelerAuthGuard), not from a route param — there is intentionally
   * no way for a caller to name which booking they want.
   */
  @Get('trip')
  getTrip(@Req() req: { travelerSession: { travelerId: string; bookingId: string } }) {
    return this.travelerApp.getTrip(req.travelerSession);
  }
}
