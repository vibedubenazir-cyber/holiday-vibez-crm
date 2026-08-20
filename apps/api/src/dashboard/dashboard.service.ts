import { Injectable } from '@nestjs/common';
import { LeadStatus, PaymentType, BookingStatus, Prisma, Role } from '@prisma/client';
import { PrismaService } from '../prisma.service';

type Actor = { id: string; role: Role; branchId: string | null };

// Statuses counted as "lost" for the Query Stages / lead-source breakdowns —
// mirrors the dashboard page's existing bucket grouping.
const LOST_STATUSES: LeadStatus[] = [LeadStatus.JUNK_NOT_INTERESTED, LeadStatus.PLAN_DROPPED];
const BOOKED_STATUS = LeadStatus.CONFIRMED;
const PROGRESS_STATUSES: LeadStatus[] = [
  LeadStatus.PROPOSAL_SENT,
  LeadStatus.HOT_LEAD,
  LeadStatus.PROPOSAL_CONFIRMED,
  LeadStatus.FOLLOW_UP,
  LeadStatus.POSTPONED,
];
const PENDING_STATUSES: LeadStatus[] = [LeadStatus.NEW, LeadStatus.NO_CONNECT];

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}
function startOfYear(): Date {
  return new Date(new Date().getFullYear(), 0, 1);
}
function monthLabel(i: number): string {
  return ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][i];
}

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  // Consultants only ever see their own leads; Branch Managers their branch;
  // Director/Admin/Finance/Auditor see everything (optionally filtered by an
  // explicit branchId query param, same convention as the reports module).
  private leadWhere(actor: Actor, branchId?: string): Prisma.LeadWhereInput {
    if (actor.role === Role.TRAVEL_CONSULTANT) return { assignedConsultantId: actor.id };
    if (actor.role === Role.BRANCH_MANAGER) return { branchId: actor.branchId ?? '__none__' };
    return branchId ? { branchId } : {};
  }

  private bookingWhere(actor: Actor, branchId?: string): Prisma.BookingWhereInput {
    const leadWhere = this.leadWhere(actor, branchId);
    if (Object.keys(leadWhere).length === 0) return {};
    return { quotation: { lead: leadWhere } };
  }

  async overview(actor: Actor, branchId?: string) {
    const leadWhere = this.leadWhere(actor, branchId);
    const bookingWhere = this.bookingWhere(actor, branchId);
    const today = startOfToday();
    const yearStart = startOfYear();
    const now = new Date();

    const [
      allLeads,
      todaysCount,
      whatsappRecent,
      remindersRaw,
      notesRaw,
      thisYearLeads,
      pendingPayments,
      upcomingTours,
      destinationRows,
      leadSourceRows,
      salesRepRows,
      revenuePayments,
    ] = await Promise.all([
      this.prisma.lead.findMany({ where: leadWhere, select: { id: true, status: true } }),
      this.prisma.lead.count({ where: { ...leadWhere, createdAt: { gte: today } } }),
      this.prisma.message.findMany({
        where: {
          direction: 'INBOUND',
          createdAt: { gte: new Date(now.getTime() - 48 * 60 * 60 * 1000) },
          conversation: { channel: 'WHATSAPP', lead: leadWhere },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: {
          conversation: {
            include: { lead: { select: { id: true, clientName: true, phone: true, status: true, temperature: true, destination: true } } },
          },
        },
      }),
      this.prisma.leadReminder.findMany({
        where: { completedAt: null, lead: leadWhere },
        orderBy: { dueAt: 'asc' },
        take: 10,
        include: { assignedTo: { select: { name: true } }, lead: { select: { id: true, clientName: true } } },
      }),
      this.prisma.leadNote.findMany({
        where: { lead: leadWhere },
        orderBy: { createdAt: 'desc' },
        take: 8,
        include: { author: { select: { name: true } }, lead: { select: { id: true, clientName: true } } },
      }),
      this.prisma.lead.findMany({ where: { ...leadWhere, createdAt: { gte: yearStart } }, select: { createdAt: true, status: true } }),
      this.prisma.payment.findMany({
        where: { type: PaymentType.CLIENT_RECEIPT, paidAt: null, dueDate: { not: null }, booking: bookingWhere },
        orderBy: { dueDate: 'asc' },
        take: 10,
        include: { booking: { include: { quotation: { include: { lead: { select: { clientName: true } } } } } } },
      }),
      this.prisma.booking.findMany({
        where: { ...bookingWhere, status: { not: BookingStatus.CANCELLED }, departureDate: { gte: now, lte: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000) } },
        orderBy: { departureDate: 'asc' },
        take: 8,
        include: { quotation: { include: { lead: { select: { clientName: true, destination: true } } } } },
      }),
      this.prisma.lead.groupBy({ by: ['destination'], where: leadWhere, _count: { _all: true }, orderBy: { _count: { destination: 'desc' } }, take: 10 }),
      this.prisma.lead.groupBy({ by: ['source', 'status'], where: leadWhere, _count: { _all: true } }),
      this.prisma.lead.groupBy({ by: ['assignedConsultantId', 'status'], where: { ...leadWhere, assignedConsultantId: { not: null } }, _count: { _all: true } }),
      this.prisma.payment.findMany({
        where: { type: PaymentType.CLIENT_RECEIPT, paidAt: { gte: yearStart }, booking: bookingWhere },
        select: { amount: true, paidAt: true },
      }),
    ]);

    // Status cards: total (all-time in scope) + today count per status.
    const totalByStatus = new Map<LeadStatus, number>();
    allLeads.forEach((l) => totalByStatus.set(l.status, (totalByStatus.get(l.status) ?? 0) + 1));
    const todayLeadsByStatus = await this.prisma.lead.groupBy({ by: ['status'], where: { ...leadWhere, createdAt: { gte: today } }, _count: { _all: true } });
    const todayByStatus = new Map<LeadStatus, number>();
    todayLeadsByStatus.forEach((r) => todayByStatus.set(r.status, r._count._all));
    const statusCards = Object.values(LeadStatus).map((status) => ({
      status,
      total: totalByStatus.get(status) ?? 0,
      today: todayByStatus.get(status) ?? 0,
    }));

    // Query stages — 4-bucket distribution over all-time leads in scope.
    const totalLeads = allLeads.length;
    const bucketCount = (statuses: LeadStatus[]) => allLeads.filter((l) => statuses.includes(l.status)).length;
    const queryStages = [
      { bucket: 'pending' as const, count: bucketCount(PENDING_STATUSES) },
      { bucket: 'progress' as const, count: bucketCount(PROGRESS_STATUSES) },
      { bucket: 'booked' as const, count: bucketCount([BOOKED_STATUS]) },
      { bucket: 'lost' as const, count: bucketCount(LOST_STATUSES) },
    ].map((b) => ({ ...b, pct: totalLeads > 0 ? Math.round((b.count / totalLeads) * 1000) / 10 : 0 }));

    // This Year Queries — monthly total vs confirmed, Jan..Dec of the current year.
    const monthlyTotals = Array.from({ length: 12 }, () => 0);
    const monthlyConfirmed = Array.from({ length: 12 }, () => 0);
    thisYearLeads.forEach((l) => {
      const m = new Date(l.createdAt).getMonth();
      monthlyTotals[m] += 1;
      if (l.status === BOOKED_STATUS) monthlyConfirmed[m] += 1;
    });
    const monthlyQueries = monthlyTotals.map((total, i) => ({ month: monthLabel(i), total, confirmed: monthlyConfirmed[i] }));

    // Financial Summary — monthly paid CLIENT_RECEIPT revenue this year.
    const monthlyRevenue = Array.from({ length: 12 }, () => 0);
    revenuePayments.forEach((p) => {
      if (!p.paidAt) return;
      monthlyRevenue[new Date(p.paidAt).getMonth()] += Number(p.amount);
    });
    const financialSummary = monthlyRevenue.map((revenue, i) => ({ month: monthLabel(i), revenue: Math.round(revenue) }));

    // Top destinations
    const topDestinations = destinationRows.map((r) => ({ destination: r.destination, count: r._count._all }));

    // Top lead source — total/confirmed/lost per source.
    const sourceMap = new Map<string, { total: number; confirmed: number; lost: number }>();
    leadSourceRows.forEach((r) => {
      const entry = sourceMap.get(r.source) ?? { total: 0, confirmed: 0, lost: 0 };
      entry.total += r._count._all;
      if (r.status === BOOKED_STATUS) entry.confirmed += r._count._all;
      if (LOST_STATUSES.includes(r.status)) entry.lost += r._count._all;
      sourceMap.set(r.source, entry);
    });
    const topLeadSource = Array.from(sourceMap.entries())
      .map(([source, v]) => ({ source, ...v }))
      .sort((a, b) => b.total - a.total);

    // Sales representative — assigned vs confirmed per consultant.
    const repMap = new Map<string, { assigned: number; confirmed: number }>();
    salesRepRows.forEach((r) => {
      const id = r.assignedConsultantId as string;
      const entry = repMap.get(id) ?? { assigned: 0, confirmed: 0 };
      entry.assigned += r._count._all;
      if (r.status === BOOKED_STATUS) entry.confirmed += r._count._all;
      repMap.set(id, entry);
    });
    const repIds = Array.from(repMap.keys());
    const reps = repIds.length ? await this.prisma.user.findMany({ where: { id: { in: repIds } }, select: { id: true, name: true } }) : [];
    const repNames = new Map(reps.map((r) => [r.id, r.name]));
    const salesRepresentative = Array.from(repMap.entries())
      .map(([id, v]) => ({ consultantId: id, name: repNames.get(id) ?? 'Unknown', ...v }))
      .sort((a, b) => b.assigned - a.assigned)
      .slice(0, 10);

    return {
      todaysQueries: todaysCount,
      totalQueries: totalLeads,
      statusCards,
      queryStages,
      monthlyQueries,
      financialSummary,
      whatsappRecent: whatsappRecent.map((m) => ({
        id: m.id,
        clientName: m.conversation.lead.clientName,
        phone: m.conversation.lead.phone,
        body: m.body,
        status: m.conversation.lead.status,
        temperature: m.conversation.lead.temperature,
        createdAt: m.createdAt,
      })),
      reminders: remindersRaw.map((r) => ({
        id: r.id,
        leadId: r.leadId,
        clientName: r.lead.clientName,
        note: r.note,
        dueAt: r.dueAt,
        assignedToName: r.assignedTo.name,
        overdue: r.dueAt < now,
      })),
      notes: notesRaw.map((n) => ({
        id: n.id,
        leadId: n.leadId,
        clientName: n.lead.clientName,
        body: n.body,
        authorName: n.author.name,
        createdAt: n.createdAt,
      })),
      paymentCollection: pendingPayments.map((p) => ({
        id: p.id,
        bookingId: p.bookingId,
        clientName: p.booking.quotation.lead.clientName,
        amount: Number(p.amount),
        dueDate: p.dueDate,
        overdue: p.dueDate !== null && p.dueDate < now,
      })),
      upcomingTours: upcomingTours.map((b) => ({
        id: b.id,
        clientName: b.quotation.lead.clientName,
        destination: b.quotation.lead.destination,
        departureDate: b.departureDate,
      })),
      topDestinations,
      topLeadSource,
      salesRepresentative,
    };
  }
}
