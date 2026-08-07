import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { UpsertBudgetDto } from './dto/budget.dto';

@Injectable()
export class BudgetsService {
  constructor(private readonly prisma: PrismaService) {}

  // One row per branch+category+month is enforced by the DB unique constraint,
  // so "set a budget" is always an upsert — no separate create/update split
  // for callers to worry about getting wrong.
  upsert(dto: UpsertBudgetDto, branchId: string, createdBy: string) {
    return this.prisma.budget.upsert({
      where: { branchId_category_month_year: { branchId, category: dto.category, month: dto.month, year: dto.year } },
      create: { branchId, category: dto.category, month: dto.month, year: dto.year, budgetedAmount: dto.budgetedAmount, createdBy },
      update: { budgetedAmount: dto.budgetedAmount },
    });
  }

  async findAll(filter: { branchId?: string; month: number; year: number }) {
    const [budgets, expenses] = await Promise.all([
      this.prisma.budget.findMany({ where: { branchId: filter.branchId, month: filter.month, year: filter.year } }),
      this.prisma.expense.findMany({
        where: {
          branchId: filter.branchId,
          expenseDate: { gte: new Date(filter.year, filter.month - 1, 1), lt: new Date(filter.year, filter.month, 1) },
        },
      }),
    ]);

    const actualByCategory = new Map<string, number>();
    for (const e of expenses) {
      const key = `${e.branchId}:${e.category}`;
      actualByCategory.set(key, (actualByCategory.get(key) ?? 0) + Number(e.amount));
    }

    return budgets.map((b) => {
      const actual = actualByCategory.get(`${b.branchId}:${b.category}`) ?? 0;
      const budgeted = Number(b.budgetedAmount);
      return {
        id: b.id,
        branchId: b.branchId,
        category: b.category,
        month: b.month,
        year: b.year,
        budgetedAmount: budgeted,
        actualAmount: actual,
        variance: budgeted - actual,
        percentUsed: budgeted > 0 ? Math.round((actual / budgeted) * 100) : 0,
      };
    });
  }
}
