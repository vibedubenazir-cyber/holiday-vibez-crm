import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateCurrencyRateDto, UpdateCurrencyRateDto } from './dto/currency.dto';

@Injectable()
export class CurrencyService {
  private readonly logger = new Logger(CurrencyService.name);

  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.currencyRate.findMany({ orderBy: { code: 'asc' } });
  }

  create(dto: CreateCurrencyRateDto) {
    return this.prisma.currencyRate.create({
      data: { code: dto.code.toUpperCase(), rateToInr: dto.rateToInr, source: 'MANUAL' },
    });
  }

  async update(id: string, dto: UpdateCurrencyRateDto) {
    const existing = await this.prisma.currencyRate.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Currency rate not found');
    // An explicit Admin edit always means MANUAL going forward — the scheduled mock
    // feed (see refreshRates) never touches MANUAL-sourced rates again after this.
    return this.prisma.currencyRate.update({
      where: { id },
      data: { ...dto, source: 'MANUAL', lastUpdatedAt: new Date() },
    });
  }

  // No real forex API key exists in this environment — this simulates a scheduled
  // rate feed (e.g. exchangerate-api.io) with a small randomized drift, so the
  // "scheduled exchange-rate updates" behavior is demonstrable. Swapping in a real
  // provider means replacing this method's body, not any caller.
  async refreshRates() {
    const rates = await this.prisma.currencyRate.findMany({ where: { active: true, source: 'API' } });
    for (const rate of rates) {
      const driftPct = (Math.random() - 0.5) * 0.01; // +/- 0.5%
      const next = Number(rate.rateToInr) * (1 + driftPct);
      await this.prisma.currencyRate.update({
        where: { id: rate.id },
        data: { rateToInr: Math.round(next * 10000) / 10000, lastUpdatedAt: new Date() },
      });
    }
    if (rates.length > 0) this.logger.log(`Refreshed ${rates.length} currency rate(s)`);
  }
}
