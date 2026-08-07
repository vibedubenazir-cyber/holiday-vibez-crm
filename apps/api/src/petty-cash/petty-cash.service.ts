import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreatePettyCashEntryDto } from './dto/petty-cash.dto';

@Injectable()
export class PettyCashService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(filter: { branchId?: string }) {
    return this.prisma.pettyCashEntry.findMany({
      where: { branchId: filter.branchId },
      orderBy: { entryDate: 'desc' },
    });
  }

  create(dto: CreatePettyCashEntryDto, branchId: string, createdBy: string) {
    return this.prisma.pettyCashEntry.create({
      data: {
        branchId,
        type: dto.type,
        amount: dto.amount,
        category: dto.category,
        description: dto.description,
        entryDate: new Date(dto.entryDate),
        createdBy,
      },
    });
  }

  // Running cash-in-hand balance: sum of CASH_IN minus sum of CASH_OUT for the branch.
  async balance(filter: { branchId?: string }) {
    const entries = await this.findAll(filter);
    let balance = 0;
    for (const e of entries) {
      balance += e.type === 'CASH_IN' ? Number(e.amount) : -Number(e.amount);
    }
    return { balance };
  }
}
