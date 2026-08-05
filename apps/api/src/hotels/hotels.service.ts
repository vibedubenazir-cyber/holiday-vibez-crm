import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateHotelDto, UpdateHotelDto } from './dto/hotel.dto';

@Injectable()
export class HotelsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.hotel.findMany({ orderBy: { name: 'asc' } });
  }

  create(dto: CreateHotelDto) {
    return this.prisma.hotel.create({ data: dto });
  }

  async update(id: string, dto: UpdateHotelDto) {
    const existing = await this.prisma.hotel.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Hotel not found');
    return this.prisma.hotel.update({ where: { id }, data: dto });
  }
}
