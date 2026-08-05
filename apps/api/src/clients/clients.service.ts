import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateClientDto, UpdateClientDto } from './dto/client.dto';

@Injectable()
export class ClientsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.client.findMany({ orderBy: { name: 'asc' } });
  }

  create(dto: CreateClientDto) {
    return this.prisma.client.create({ data: dto });
  }

  async update(id: string, dto: UpdateClientDto) {
    const existing = await this.prisma.client.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Client not found');
    return this.prisma.client.update({ where: { id }, data: dto });
  }
}
