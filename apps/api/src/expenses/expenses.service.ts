import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ExpenseStatus } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { CreateExpenseDto } from './dto/expense.dto';

@Injectable()
export class ExpensesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(filter: { branchId?: string; status?: ExpenseStatus }) {
    return this.prisma.expense.findMany({
      where: { branchId: filter.branchId, status: filter.status },
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

  // Only APPROVED expenses count as real spend — matches the same gate applied
  // to reports.service.ts's monthly P&L/daily ledger and budgets.service.ts's
  // actual-vs-budgeted calc, so this figure and those never disagree.
  async summaryByCategory(filter: { branchId?: string }) {
    const expenses = await this.findAll({ branchId: filter.branchId, status: 'APPROVED' });
    const totals = new Map<string, number>();
    for (const e of expenses) {
      totals.set(e.category, (totals.get(e.category) ?? 0) + Number(e.amount));
    }
    return Array.from(totals.entries()).map(([category, total]) => ({ category, total }));
  }

  async review(id: string, status: 'APPROVED' | 'REJECTED', reviewerId: string, comment: string | undefined) {
    const expense = await this.prisma.expense.findUnique({ where: { id } });
    if (!expense) throw new NotFoundException('Expense not found');
    if (expense.status !== 'PENDING') throw new BadRequestException('This expense has already been reviewed');
    if (expense.createdBy === reviewerId) {
      throw new ForbiddenException('You cannot approve or reject an expense you logged yourself');
    }
    return this.prisma.expense.update({
      where: { id },
      data: { status, reviewedById: reviewerId, reviewedAt: new Date(), reviewComment: comment },
    });
  }
}
