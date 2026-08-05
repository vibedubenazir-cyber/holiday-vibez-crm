import { Controller, Get, Param } from '@nestjs/common';
import { QuotationsService } from './quotations.service';

// Unauthenticated — the customer opening a quotation link has no account.
// quotationsService.publicView() only returns SENT quotations, so a leaked
// draft/pending link exposes nothing.
@Controller('public/quotations')
export class PublicQuotationController {
  constructor(private readonly quotationsService: QuotationsService) {}

  @Get(':id')
  view(@Param('id') id: string) {
    return this.quotationsService.publicView(id);
  }
}
