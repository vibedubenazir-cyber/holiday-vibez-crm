import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateTemplateDto, UpdateTemplateDto } from './dto/template.dto';

@Injectable()
export class TemplatesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.template.findMany({ orderBy: [{ channel: 'asc' }, { name: 'asc' }] });
  }

  create(dto: CreateTemplateDto, createdBy: string) {
    return this.prisma.template.create({
      data: {
        channel: dto.channel,
        name: dto.name,
        subject: dto.channel === 'EMAIL' ? dto.subject : undefined,
        body: dto.body,
        createdBy,
      },
    });
  }

  async update(id: string, dto: UpdateTemplateDto) {
    const existing = await this.prisma.template.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Template not found');
    return this.prisma.template.update({ where: { id }, data: dto });
  }
}
