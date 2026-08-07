import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateDmcCommissionDto } from './dto/dmc-commission.dto';

@Injectable()
export class DmcCommissionsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(status?: 'PENDING' | 'RECEIVED') {
    return this.prisma.dmcCommission.findMany({
      where: { status },
      include: { supplier: true, booking: { include: { quotation: { include: { lead: true } } } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  create(dto: CreateDmcCommissionDto, createdBy: string) {
    return this.prisma.dmcCommission.create({
      data: {
        supplierId: dto.supplierId,
        bookingId: dto.bookingId,
        amount: dto.amount,
        tdsAmount: dto.tdsAmount ?? 0,
        notes: dto.notes,
        createdBy,
      },
    });
  }

  async markReceived(id: string) {
    const commission = await this.prisma.dmcCommission.findUnique({ where: { id } });
    if (!commission) throw new NotFoundException('Commission not found');
    if (commission.status === 'RECEIVED') return commission;
    return this.prisma.dmcCommission.update({ where: { id }, data: { status: 'RECEIVED', receivedAt: new Date() } });
  }
}
