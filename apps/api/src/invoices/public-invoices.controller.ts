import { Controller, Get, Param, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { InvoicesService } from './invoices.service';
import { RateLimitGuard } from '../common/guards/rate-limit.guard';
import { streamBrandedPdf } from '../common/pdf.util';

// Unauthenticated — the customer opening an invoice link has no account.
@UseGuards(RateLimitGuard)
@Controller('public/invoices')
export class PublicInvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  @Get(':id')
  view(@Param('id') id: string) {
    return this.invoicesService.publicView(id);
  }

  @Get(':id/pdf')
  async pdf(@Param('id') id: string, @Res() res: Response) {
    const invoice = await this.invoicesService.publicView(id);
    const total = invoice.amount + invoice.taxAmount;
    streamBrandedPdf(res, {
      title: 'Tax Invoice',
      refNo: invoice.invoiceNo,
      issuedAt: new Date(invoice.issuedAt),
      company: invoice.company,
      client: invoice.customerGstin ? { ...invoice.client, gstin: invoice.customerGstin } : invoice.client,
      rows: [
        { label: 'Amount', value: `${invoice.currency} ${invoice.amount.toLocaleString('en-IN')}` },
        { label: `GST (${invoice.gstRate}%)`, value: `${invoice.currency} ${invoice.taxAmount.toLocaleString('en-IN')}` },
      ],
      total: { label: 'Total', value: `${invoice.currency} ${total.toLocaleString('en-IN')}` },
      footerNote: `Thank you for booking with ${invoice.company.name}. Contact your travel consultant with any billing questions.`,
    });
  }
}
