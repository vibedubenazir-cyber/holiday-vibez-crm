import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { InvoicesService } from './invoices.service';
import { RateLimitGuard } from '../common/guards/rate-limit.guard';

// Unauthenticated — the customer opening an invoice link has no account.
@UseGuards(RateLimitGuard)
@Controller('public/invoices')
export class PublicInvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  @Get(':id')
  view(@Param('id') id: string) {
    return this.invoicesService.publicView(id);
  }
}
