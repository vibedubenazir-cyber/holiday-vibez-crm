import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateRateCardDto, UpdateRateCardDto } from './dto/rate-card.dto';

@Injectable()
export class RateCardsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.rateCard.findMany({ orderBy: [{ destination: 'asc' }, { name: 'asc' }] });
  }

  create(dto: CreateRateCardDto, createdBy: string) {
    return this.prisma.rateCard.create({
      data: {
        type: dto.type,
        destination: dto.destination,
        name: dto.name,
        baseCost: dto.baseCost,
        taxPct: dto.taxPct ?? 0,
        currency: dto.currency ?? 'INR',
        source: 'MANUAL',
        createdBy,
      },
    });
  }

  async update(id: string, dto: UpdateRateCardDto) {
    const existing = await this.prisma.rateCard.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Rate card not found');

    // Editing an active rate bumps its version — quotations snapshot amounts at
    // selection time (spec Section 5), so old quotations are unaffected by this.
    return this.prisma.rateCard.update({
      where: { id },
      data: { ...dto, version: existing.version + 1 },
    });
  }
}
