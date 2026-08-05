import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateRoomTypeDto, UpdateRoomTypeDto } from './dto/room-type.dto';

@Injectable()
export class RoomTypesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.roomType.findMany({ orderBy: { name: 'asc' } });
  }

  create(dto: CreateRoomTypeDto) {
    return this.prisma.roomType.create({ data: dto });
  }

  async update(id: string, dto: UpdateRoomTypeDto) {
    const existing = await this.prisma.roomType.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Room type not found');
    return this.prisma.roomType.update({ where: { id }, data: dto });
  }
}
