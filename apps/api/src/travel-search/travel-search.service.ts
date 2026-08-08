import { Injectable } from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { QuotationsService } from '../quotations/quotations.service';
import { AddSearchResultToQuotationDto } from './dto/travel-search.dto';

@Injectable()
export class TravelSearchAddService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly quotationsService: QuotationsService,
  ) {}

  // A live-search result isn't master data an Admin curated — it's a one-off rate
  // discovered at search time. Rather than inventing a parallel "search result ->
  // booking" pipeline, this turns the selection into a RateCard (source: API) and
  // replays the exact same QuotationsService.addItem() flow every manually-added
  // rate card already goes through, so price-snapshotting, quotation totals, and
  // everything downstream (approval, booking, vouchers) needs zero changes.
  async addToQuotation(dto: AddSearchResultToQuotationDto, actor: { id: string; role: Role; branchId: string | null }) {
    const baseCost = Math.round(dto.netRate * (1 + dto.markupPct / 100) * 100) / 100;

    const rateCard = await this.prisma.rateCard.create({
      data: {
        type: dto.type,
        destination: dto.destination,
        name: dto.name,
        baseCost,
        taxPct: 0,
        currency: 'INR',
        source: 'API',
        createdBy: actor.id,
      },
    });

    return this.quotationsService.addItem(dto.quotationId, {
      rateCardId: rateCard.id,
      quantity: dto.quantity ?? 1,
    }, actor);
  }
}
