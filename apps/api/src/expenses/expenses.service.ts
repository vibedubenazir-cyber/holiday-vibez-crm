import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateExpenseDto } from './dto/expense.dto';

@Injectable()
export class ExpensesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(filter: { branchId?: string }) {
    return this.prisma.expense.findMany({
      where: { branchId: filter.branchId },
      orderBy: { expenseDate: 'desc' },
    });
  }

  create(dto: CreateExpenseDto, branchId: string, createdBy: string) {
    return this.prisma.expense.create({
      data: {
        branchId,
        category: dto.category,
        description: dto.description,
        amount: dto.amount,
        currency: dto.currency ?? 'INR',
        expenseDate: new Date(dto.expenseDate),
        createdBy,
      },
    });
  }

  async summaryByCategory(filter: { branchId?: string }) {
    const expenses = await this.findAll(filter);
    const totals = new Map<string, number>();
    for (const e of expenses) {
      totals.set(e.category, (totals.get(e.category) ?? 0) + Number(e.amount));
    }
    return Array.from(totals.entries()).map(([category, total]) => ({ category, total }));
  }
}
