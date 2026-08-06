import { Controller, Get, Param, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { VouchersService } from './vouchers.service';
import { RateLimitGuard } from '../common/guards/rate-limit.guard';
import { streamBrandedPdf } from '../common/pdf.util';

// Unauthenticated — the customer opening a voucher link has no account.
@UseGuards(RateLimitGuard)
@Controller('public/vouchers')
export class PublicVouchersController {
  constructor(private readonly vouchersService: VouchersService) {}

  @Get(':id')
  view(@Param('id') id: string) {
    return this.vouchersService.publicView(id);
  }

  @Get(':id/pdf')
  async pdf(@Param('id') id: string, @Res() res: Response) {
    const voucher = await this.vouchersService.publicView(id);
    streamBrandedPdf(res, {
      title: `${voucher.type} Voucher`,
      refNo: voucher.refNo,
      issuedAt: new Date(voucher.issuedAt),
      company: voucher.company,
      client: voucher.client,
      rows: [
        { label: 'Departure date', value: new Date(voucher.departureDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) },
        ...voucher.items.map((item) => ({ label: item.description, value: `x${item.quantity}` })),
      ],
      footerNote: `Please carry a printed or digital copy of this voucher along with a valid photo ID. Contact ${voucher.company.name} for any assistance.`,
    });
  }
}
