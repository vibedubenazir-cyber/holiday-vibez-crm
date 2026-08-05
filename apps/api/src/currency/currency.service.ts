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

  // Called on a schedule (see apps/api/src/jobs/jobs.scheduler.ts) — updates every
  // API-sourced rate, never MANUAL ones (an Admin's explicit override always wins).
  // Pulls real rates from exchangerate-api.com when FOREX_API_KEY is set; falls
  // back to a small randomized drift (demonstrates the "scheduled updates" behavior
  // without a key) otherwise.
  async refreshRates() {
    const rates = await this.prisma.currencyRate.findMany({ where: { active: true, source: 'API' } });
    if (rates.length === 0) return;

    if (process.env.FOREX_API_KEY) {
      await this.refreshFromForexApi(rates);
    } else {
      await this.refreshWithMockDrift(rates);
    }
  }

  private async refreshFromForexApi(rates: { id: string; code: string }[]) {
    try {
      const res = await fetch(`https://v6.exchangerate-api.com/v6/${process.env.FOREX_API_KEY}/latest/INR`);
      const body = await res.json();
      if (!res.ok || body.result !== 'success') {
        this.logger.error(`Forex API refresh failed: ${JSON.stringify(body)}`);
        return;
      }

      let updated = 0;
      for (const rate of rates) {
        // exchangerate-api.com's conversion_rates are "1 INR = X {code}" (base
        // INR); we store the inverse, "1 {code} = X INR".
        const inrToCode: number | undefined = body.conversion_rates?.[rate.code];
        if (!inrToCode) {
          this.logger.warn(`Forex API has no rate for ${rate.code} — leaving it unchanged`);
          continue;
        }
        const rateToInr = 1 / inrToCode;
        await this.prisma.currencyRate.update({
          where: { id: rate.id },
          data: { rateToInr: Math.round(rateToInr * 10000) / 10000, lastUpdatedAt: new Date() },
        });
        updated++;
      }
      this.logger.log(`Refreshed ${updated} currency rate(s) from exchangerate-api.com`);
    } catch (err) {
      this.logger.error('Forex API refresh threw', err as Error);
    }
  }

  private async refreshWithMockDrift(rates: { id: string; rateToInr: unknown }[]) {
    for (const rate of rates) {
      const driftPct = (Math.random() - 0.5) * 0.01; // +/- 0.5%
      const next = Number(rate.rateToInr) * (1 + driftPct);
      await this.prisma.currencyRate.update({
        where: { id: rate.id },
        data: { rateToInr: Math.round(next * 10000) / 10000, lastUpdatedAt: new Date() },
      });
    }
    this.logger.log(`Refreshed ${rates.length} currency rate(s) (mock drift — no FOREX_API_KEY configured)`);
  }
}
