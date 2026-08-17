import { Injectable, NotFoundException } from '@nestjs/common';
import { ItineraryEventType } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { CreateItineraryEventTemplateDto, UpdateItineraryEventTemplateDto } from './dto/itinerary-event-template.dto';

@Injectable()
export class ItineraryEventTemplatesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(type?: ItineraryEventType, destination?: string) {
    return this.prisma.itineraryEventTemplate.findMany({
      where: {
        active: true,
        type,
        destination: destination ? { contains: destination, mode: 'insensitive' } : undefined,
      },
      orderBy: { name: 'asc' },
    });
  }

  create(dto: CreateItineraryEventTemplateDto) {
    return this.prisma.itineraryEventTemplate.create({ data: dto });
  }

  async update(id: string, dto: UpdateItineraryEventTemplateDto) {
    const existing = await this.prisma.itineraryEventTemplate.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Event template not found');
    return this.prisma.itineraryEventTemplate.update({ where: { id }, data: dto });
  }
}
