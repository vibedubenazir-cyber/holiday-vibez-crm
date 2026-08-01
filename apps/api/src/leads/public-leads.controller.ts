import { Body, Controller, Headers, Post, UnauthorizedException, UseGuards } from '@nestjs/common';
import { LeadsService } from './leads.service';
import { PublicCreateLeadDto } from './dto/lead.dto';
import { RateLimitGuard } from '../common/guards/rate-limit.guard';

/**
 * Public Lead Capture API (spec Section 10) — the website's callback form, AI Trip
 * Planner, and Spin-to-Win widget post here. CORS-locked to holidayvibez.com at the
 * infra/Nginx layer in production; here we check a shared API key and rate-limit.
 * This endpoint can only ever create a lead — no read/update/delete surface.
 */
@UseGuards(RateLimitGuard)
@Controller('public/leads')
export class PublicLeadsController {
  constructor(private readonly leadsService: LeadsService) {}

  @Post()
  async create(@Body() dto: PublicCreateLeadDto, @Headers('x-api-key') apiKey?: string) {
    const expected = process.env.PUBLIC_LEAD_API_KEY;
    if (expected && apiKey !== expected) {
      throw new UnauthorizedException('Invalid API key');
    }
    return this.leadsService.createPublic(dto);
  }
}
