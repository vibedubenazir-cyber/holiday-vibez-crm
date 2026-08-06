import { Controller, Get, Param, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { QuotationsService } from './quotations.service';
import { RateLimitGuard } from '../common/guards/rate-limit.guard';
import { streamBrandedPdf } from '../common/pdf.util';

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

  @Get(':id/pdf')
  async pdf(@Param('id') id: string, @Res() res: Response) {
    const quotation = await this.quotationsService.publicView(id);
    streamBrandedPdf(res, {
      title: 'Quotation',
      refNo: quotation.refNo,
      issuedAt: new Date(quotation.createdAt),
      company: quotation.company,
      client: quotation.client,
      rows: quotation.items.map((item) => ({
        label: `${item.description} x${item.quantity}`,
        value: `${quotation.currency} ${item.lineTotal.toLocaleString('en-IN')}`,
      })),
      total: { label: 'Total', value: `${quotation.currency} ${quotation.totalAmount.toLocaleString('en-IN')}` },
      footerNote: `Thank you for considering ${quotation.company.name}. This quotation is subject to availability at the time of booking.`,
    });
  }
}
