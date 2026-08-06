import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { QuotationsService } from './quotations.service';
import { RateLimitGuard } from '../common/guards/rate-limit.guard';

// Unauthenticated — the customer opening a quotation link has no account.
// quotationsService.publicView() only returns SENT quotations, so a leaked
// draft/pending link exposes nothing. Rate-limited against scripted
// enumeration of quotation ids, matching every other public controller.
@UseGuards(RateLimitGuard)
@Controller('public/quotations')
export class PublicQuotationController {
  constructor(private readonly quotationsService: QuotationsService) {}

  @Get(':id')
  view(@Param('id') id: string) {
    return this.quotationsService.publicView(id);
  }
}
