import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class ReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

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
          status: 'APPROVED',
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
  async complianceExpiring(branchId?: string) {
    const travelers = await this.prisma.traveler.findMany({
      where: branchId ? { lead: { branchId } } : undefined,
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
          assignedConsultantId: traveler.lead.assignedConsultantId,
          departureDate: upcomingBooking.departureDate,
          passportExpiry: traveler.passportExpiry,
          visaStatus: traveler.visaStatus,
          reason: monthsToExpiry === null ? 'No passport on file' : monthsToExpiry < 6 ? 'Passport expires within 6 months of departure' : 'Visa status not recorded',
        });
      }
    }
    return flagged;
  }

  // Scheduled daily (see jobs/jobs.scheduler.ts's "compliance-check") — turns the
  // pull report above into a push alert so a manager doesn't have to remember to
  // open it. Re-sends every run rather than tracking "already notified" state:
  // compliance risk is important enough to keep surfacing until the traveler's
  // record is actually fixed, and a daily PUSH ping is not spam at that cadence.
  async notifyComplianceIssues() {
    const flagged = await this.complianceExpiring();
    let sent = 0;
    for (const issue of flagged) {
      if (!issue.assignedConsultantId) continue;
      await this.notifications.send({
        channel: 'PUSH',
        triggerType: 'compliance_alert',
        recipient: issue.assignedConsultantId,
        relatedEntity: `traveler:${issue.travelerId}`,
        subject: 'Travel document compliance alert',
        body: `${issue.name}: ${issue.reason} (departs ${new Date(issue.departureDate).toLocaleDateString()})`,
      });
      sent++;
    }
    return { flagged: flagged.length, notified: sent };
  }

  // Auto-generated view (not a stored journal) over the day's real cash
  // movements — Payments actually paid, Expenses logged, and Petty Cash
  // entries — so it's always in sync with those source records with no
  // separate ledger-entry data entry step.
  async dailyLedger(date: string, branchId?: string) {
    const dayStart = new Date(`${date}T00:00:00.000Z`);
    const dayEnd = new Date(`${date}T23:59:59.999Z`);

    const [payments, expenses, pettyCash] = await Promise.all([
      this.prisma.payment.findMany({
        where: {
          paidAt: { gte: dayStart, lte: dayEnd },
          ...(branchId ? { booking: { quotation: { lead: { branchId } } } } : {}),
        },
        include: { booking: { include: { quotation: { include: { lead: true } } } } },
      }),
      this.prisma.expense.findMany({
        where: { expenseDate: { gte: dayStart, lte: dayEnd }, status: 'APPROVED', ...(branchId ? { branchId } : {}) },
      }),
      this.prisma.pettyCashEntry.findMany({
        where: { entryDate: { gte: dayStart, lte: dayEnd }, ...(branchId ? { branchId } : {}) },
      }),
    ]);

    const rows = [
      ...payments.map((p) => ({
        source: 'PAYMENT' as const,
        time: p.paidAt!,
        description: `${p.type.replaceAll('_', ' ')}${p.category ? ` (${p.category})` : ''} — ${p.booking.quotation.lead.clientName}`,
        direction: p.type === 'CLIENT_RECEIPT' ? ('IN' as const) : ('OUT' as const),
        amount: Number(p.amount),
      })),
      ...expenses.map((e) => ({
        source: 'EXPENSE' as const,
        time: e.expenseDate,
        description: `${e.category} — ${e.description}`,
        direction: 'OUT' as const,
        amount: Number(e.amount),
      })),
      ...pettyCash.map((p) => ({
        source: 'PETTY_CASH' as const,
        time: p.entryDate,
        description: `${p.category ?? 'Petty cash'} — ${p.description}`,
        direction: p.type === 'CASH_IN' ? ('IN' as const) : ('OUT' as const),
        amount: Number(p.amount),
      })),
    ].sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());

    const totalIn = rows.filter((r) => r.direction === 'IN').reduce((s, r) => s + r.amount, 0);
    const totalOut = rows.filter((r) => r.direction === 'OUT').reduce((s, r) => s + r.amount, 0);

    return { date, rows, totalIn, totalOut, net: totalIn - totalOut };
  }

  // Output-GST summary (GSTR-1-style: outward supplies only, matching the
  // "customer invoices only" scope GST was built for) for a given month.
  async gstReport(year: number, month: number, branchId?: string) {
    const monthStart = new Date(Date.UTC(year, month - 1, 1));
    const monthEnd = new Date(Date.UTC(year, month, 1));

    const invoices = await this.prisma.invoice.findMany({
      where: {
        issuedAt: { gte: monthStart, lt: monthEnd },
        ...(branchId ? { booking: { quotation: { lead: { branchId } } } } : {}),
      },
      orderBy: { issuedAt: 'asc' },
    });

    const taxableValue = invoices.reduce((s, i) => s + Number(i.amount), 0);
    const gstCollected = invoices.reduce((s, i) => s + Number(i.taxAmount), 0);

    return {
      year,
      month,
      invoiceCount: invoices.length,
      taxableValue,
      gstCollected,
      totalInvoiced: taxableValue + gstCollected,
      rows: invoices.map((i) => ({
        invoiceNo: i.invoiceNo,
        issuedAt: i.issuedAt,
        amount: Number(i.amount),
        gstRate: Number(i.gstRate),
        taxAmount: Number(i.taxAmount),
        customerGstin: i.customerGstin,
      })),
    };
  }

  // Single-screen rollup of everything under the Accounts umbrella (Daily Ledger,
  // Petty Cash, GST, Budgets, Bank Reconciliation, DMC Commissions) so nobody has
  // to visit six pages to see whether anything needs attention today.
  async accountsDashboard(branchId?: string) {
    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    const year = now.getFullYear();
    const month = now.getMonth() + 1;

    const [ledgerToday, gstThisMonth, pettyCashBalance, budgets, unmatchedBankTxns, pendingCommissions] = await Promise.all([
      this.dailyLedger(today, branchId),
      this.gstReport(year, month, branchId),
      this.prisma.pettyCashEntry
        .findMany({ where: branchId ? { branchId } : undefined })
        .then((entries) => entries.reduce((s, e) => s + (e.type === 'CASH_IN' ? Number(e.amount) : -Number(e.amount)), 0)),
      this.prisma.budget.findMany({ where: { month, year, ...(branchId ? { branchId } : {}) } }),
      this.prisma.bankTransaction.count({ where: { matched: false, ...(branchId ? { branchId } : {}) } }),
      // DmcCommission has no direct branchId — it reaches a branch only via
      // booking->quotation->lead. Every sibling query in this dashboard is
      // branch-scoped when branchId is set; this one was querying org-wide
      // regardless, leaking every branch's pending commission total into a
      // branch manager's Accounts dashboard.
      this.prisma.dmcCommission.findMany({
        where: {
          status: 'PENDING',
          ...(branchId ? { booking: { quotation: { lead: { branchId } } } } : {}),
        },
      }),
    ]);

    const totalBudgeted = budgets.reduce((s, b) => s + Number(b.budgetedAmount), 0);

    return {
      todayNetCashFlow: ledgerToday.net,
      todayCashIn: ledgerToday.totalIn,
      todayCashOut: ledgerToday.totalOut,
      pettyCashBalance,
      gstCollectedThisMonth: gstThisMonth.gstCollected,
      budgetedThisMonth: totalBudgeted,
      budgetCategoryCount: budgets.length,
      unmatchedBankTransactions: unmatchedBankTxns,
      pendingDmcCommissions: pendingCommissions.length,
      pendingDmcCommissionAmount: pendingCommissions.reduce((s, c) => s + Number(c.amount), 0),
    };
  }
}
