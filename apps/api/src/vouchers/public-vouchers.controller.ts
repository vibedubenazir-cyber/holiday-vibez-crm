import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { VouchersService } from './vouchers.service';
import { RateLimitGuard } from '../common/guards/rate-limit.guard';

// Unauthenticated — the customer opening a voucher link has no account.
@UseGuards(RateLimitGuard)
@Controller('public/vouchers')
export class PublicVouchersController {
  constructor(private readonly vouchersService: VouchersService) {}

  @Get(':id')
  view(@Param('id') id: string) {
    return this.vouchersService.publicView(id);
  }
}
