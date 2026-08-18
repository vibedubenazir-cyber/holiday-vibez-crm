import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { RateLimitGuard } from '../common/guards/rate-limit.guard';
import { RequestOtpDto, VerifyOtpDto } from './dto/traveler-auth.dto';
import { TravelerAuthService } from './traveler-auth.service';

/**
 * Unauthenticated by definition — this is how a traveller gets their first
 * credential. Rate-limited for the same reason the public lead-capture
 * endpoint is: it's reachable by anyone on the internet.
 */
@UseGuards(RateLimitGuard)
@Controller('traveler/auth')
export class TravelerAuthController {
  constructor(private readonly travelerAuth: TravelerAuthService) {}

  @Post('request-otp')
  requestOtp(@Body() dto: RequestOtpDto) {
    return this.travelerAuth.requestOtp(dto.identifier);
  }

  @Post('verify-otp')
  verifyOtp(@Body() dto: VerifyOtpDto) {
    return this.travelerAuth.verifyOtp(dto.identifier, dto.code);
  }
}
