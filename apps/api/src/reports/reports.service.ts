import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  // GET /reports/director-dashboard (spec Section 13) — conversion, revenue/margin,
  // DMC performance proxy, target-vs-achieved, real-time (computed on read, not cached
  // — spec says "cached for performance" for production; add a Redis cache at that point).
  async directorDashboard() {
    const [leadsByStatus, branches, payments] = await Promise.all([
      this.prisma.lead.groupBy({ by: ['status'], _count: true }),
      this.prisma.branch.findMany(),
      this.prisma.payment.findMany({ where: { paidAt: { not: null } } }),
    ]);

    const totalLeads = leadsByStatus.reduce((sum, row) => sum + row._count, 0);
    const confirmed = leadsByStatus.find((r) => r.status === 'CONFIRMED')?._count ?? 0;
    const conversionPct = totalLeads > 0 ? Math.round((confirmed / totalLeads) * 1000) / 10 : 0;

    const revenue = payments.filter((p) => p.type === 'CLIENT_RECEIPT').reduce((s, p) => s + Number(p.amount), 0);
    const payoutPayments = payments.filter((p) => p.type === 'DMC_PAYABLE' || p.type === 'COMMISSION' || p.type === 'REFUND');
    const costs = payoutPayments.reduce((s, p) => s + Number(p.amount), 0);

    // Exact spend per category (spec ask: "how much for DMC, flight, hotels,
    // activities") rather than one lump "costs" number — staff pick a
    // category when they record a payout (see payments.controller.ts).
    const costsByCategoryMap: Record<string, number> = {};
    for (const p of payoutPayments) {
      const key = p.category ?? 'UNCATEGORIZED';
      costsByCategoryMap[key] = (costsByCategoryMap[key] ?? 0) + Number(p.amount);
    }
    const costsByCategory = Object.entries(costsByCategoryMap).map(([category, total]) => ({ category, total }));

    const branchSummaries = await Promise.all(
      branches.map(async (b) => {
        const target = await this.prisma.target.findFirst({ where: { scope: 'BRANCH', scopeId: b.id }, orderBy: { createdAt: 'desc' } });
        return {
          branchId: b.id,
          name: b.name,
          revenueTarget: target ? Number(target.revenueTarget) : 0,
          revenueAchieved: target ? Number(target.revenueAchieved) : 0,
        };
      }),
    );

    return {
      totalLeads,
      leadsByStatus,
      conversionPct,
      revenue,
      costs,
      costsByCategory,
      grossMargin: revenue - costs,
      branches: branchSummaries,
    };
  }

  async branchReport(branchId: string) {
    const [leadsByStatus, quotations, bookings] = await Promise.all([
      this.prisma.lead.groupBy({ by: ['status'], where: { branchId }, _count: true }),
      this.prisma.quotation.findMany({ where: { lead: { branchId } } }),
      this.prisma.booking.findMany({ where: { quotation: { lead: { branchId } } }, include: { payments: true } }),
    ]);

    const revenue = bookings
      .flatMap((b) => b.payments)
      .filter((p) => p.type === 'CLIENT_RECEIPT' && p.paidAt)
      .reduce((s, p) => s + Number(p.amount), 0);

    return {
      branchId,
      leadsByStatus,
      quotationCount: quotations.length,
      bookingCount: bookings.length,
      revenue,
    };
  }

  // Month-by-month P&L, distinct from directorDashboard/branchReport's real-time
  // totals. Revenue/payment-costs bucket by Payment.paidAt (cash actually received/
  // paid out, same field the existing reports already treat as "real"); Expense
  // buckets by its own expenseDate. Payment has no direct branchId — same join path
  // branchReport() already uses (booking.quotation.lead.branchId).
  async getMonthlyPnL(year: number, branchId?: string) {
    const yearStart = new Date(Date.UTC(year, 0, 1));
    const yearEnd = new Date(Date.UTC(year + 1, 0, 1));

    const [payments, expenses] = await Promise.all([
      this.prisma.payment.findMany({
        where: {
          paidAt: { gte: yearStart, lt: yearEnd },
          ...(branchId ? { booking: { quotation: { lead: { branchId } } } } : {}),
        },
      }),
      this.prisma.expense.findMany({
        where: {
          expenseDate: { gte: yearStart, lt: yearEnd },
          ...(branchId ? { branchId } : {}),
        },
      }),
    ]);

    const months = Array.from({ length: 12 }, (_, i) => `${year}-${String(i + 1).padStart(2, '0')}`);
    const buckets = new Map(months.map((month) => [month, { revenue: 0, paymentCosts: 0, expenses: 0 }]));
    const costsByCategoryMap: Record<string, number> = {};

    for (const payment of payments) {
      const month = payment.paidAt!.toISOString().slice(0, 7);
      const bucket = buckets.get(month);
      if (!bucket) continue;
      const amount = Number(payment.amount);
      if (payment.type === 'CLIENT_RECEIPT') bucket.revenue += amount;
      else if (payment.type === 'DMC_PAYABLE' || payment.type === 'COMMISSION' || payment.type === 'REFUND') {
        bucket.paymentCosts += amount;
        const key = payment.category ?? 'UNCATEGORIZED';
        costsByCategoryMap[key] = (costsByCategoryMap[key] ?? 0) + amount;
      }
    }

    for (const expense of expenses) {
      const month = expense.expenseDate.toISOString().slice(0, 7);
      const bucket = buckets.get(month);
      if (!bucket) continue;
      bucket.expenses += Number(expense.amount);
    }

    return {
      rows: months.map((month) => {
        const b = buckets.get(month)!;
        return {
          month,
          revenue: b.revenue,
          paymentCosts: b.paymentCosts,
          expenses: b.expenses,
          netMargin: b.revenue - b.paymentCosts - b.expenses,
        };
      }),
      costsByCategory: Object.entries(costsByCategoryMap).map(([category, total]) => ({ category, total })),
    };
  }

  // Monthly compliance job surface (spec Section 6 step 11, Section 11) — travelers
  // on an upcoming booking whose passport expires within 6 months of departure, or has
  // no visa status recorded. Exposed as an on-demand report; a real cron trigger would
  // call this same query on a schedule (see main.ts's SLA interval for that pattern).
  async complianceExpiring() {
    const travelers = await this.prisma.traveler.findMany({
      include: { lead: { include: { quotations: { include: { bookings: true } } } } },
    });

    const flagged = [];
    for (const traveler of travelers) {
      const upcomingBooking = traveler.lead.quotations
        .flatMap((q) => q.bookings)
        .filter((b) => new Date(b.departureDate) > new Date())
        .sort((a, b) => new Date(a.departureDate).getTime() - new Date(b.departureDate).getTime())[0];
      if (!upcomingBooking) continue;

      const monthsToExpiry = traveler.passportExpiry
        ? (new Date(traveler.passportExpiry).getTime() - new Date(upcomingBooking.departureDate).getTime()) /
          (1000 * 60 * 60 * 24 * 30)
        : null;

      if (monthsToExpiry === null || monthsToExpiry < 6 || !traveler.visaStatus) {
        flagged.push({
          travelerId: traveler.id,
          name: traveler.name,
          leadId: traveler.leadId,
          departureDate: upcomingBooking.departureDate,
          passportExpiry: traveler.passportExpiry,
          visaStatus: traveler.visaStatus,
          reason: monthsToExpiry === null ? 'No passport on file' : monthsToExpiry < 6 ? 'Passport expires within 6 months of departure' : 'Visa status not recorded',
        });
      }
    }
    return flagged;
  }
}
