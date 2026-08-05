import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateDayItineraryDto, UpdateDayItineraryDto } from './dto/day-itinerary.dto';

@Injectable()
export class DayItinerariesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.dayItinerary.findMany({ orderBy: { title: 'asc' } });
  }

  create(dto: CreateDayItineraryDto) {
    return this.prisma.dayItinerary.create({ data: dto });
  }

  async update(id: string, dto: UpdateDayItineraryDto) {
    const existing = await this.prisma.dayItinerary.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Day itinerary not found');
    return this.prisma.dayItinerary.update({ where: { id }, data: dto });
  }
}
