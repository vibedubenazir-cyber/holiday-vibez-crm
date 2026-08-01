import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreatePaymentDto } from './dto/payment.dto';

@Injectable()
export class PaymentsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(bookingId?: string) {
    return this.prisma.payment.findMany({ where: { bookingId }, orderBy: { createdAt: 'desc' } });
  }

  create(dto: CreatePaymentDto) {
    return this.prisma.payment.create({
      data: {
        bookingId: dto.bookingId,
        type: dto.type,
        amount: dto.amount,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
      },
    });
  }

  // Mock hosted-checkout gateway (spec Section 11: "PCI-scope-free payments via
  // hosted checkout") — no real payment processor is wired up in this environment,
  // this just marks the record paid and stamps a synthetic gateway reference.
  async markPaid(id: string) {
    const payment = await this.prisma.payment.findUnique({ where: { id } });
    if (!payment) throw new NotFoundException('Payment not found');

    const updated = await this.prisma.payment.update({
      where: { id },
      data: { paidAt: new Date(), gatewayRef: `MOCK-${Date.now()}` },
    });

    if (payment.type === 'CLIENT_RECEIPT') {
      await this.applyToTargets(payment.bookingId, Number(payment.amount));
    }
    return updated;
  }

  // Feeds Target.revenue_achieved automatically on payment (spec Section 13 API
  // reference, Bookings & Finance row) — credits both the consultant's and their
  // branch's currently open target, if one exists.
  private async applyToTargets(bookingId: string, amount: number) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { quotation: { include: { lead: true } } },
    });
    if (!booking) return;

    const consultantId = booking.quotation.consultantId;
    const branchId = booking.quotation.lead.branchId;

    const consultantTarget = await this.prisma.target.findFirst({
      where: { scope: 'CONSULTANT', scopeId: consultantId },
      orderBy: { createdAt: 'desc' },
    });
    if (consultantTarget) {
      await this.prisma.target.update({
        where: { id: consultantTarget.id },
        data: { revenueAchieved: { increment: amount } },
      });
    }

    const branchTarget = await this.prisma.target.findFirst({
      where: { scope: 'BRANCH', scopeId: branchId },
      orderBy: { createdAt: 'desc' },
    });
    if (branchTarget) {
      await this.prisma.target.update({
        where: { id: branchTarget.id },
        data: { revenueAchieved: { increment: amount } },
      });
    }
  }

  // Branch P&L (spec Section 13: GET /finance/branch-pnl) — selling price (client
  // receipts) minus DMC payables/commission/refunds, for confirmed bookings in the branch.
  async branchPnl(branchId: string) {
    const bookings = await this.prisma.booking.findMany({
      where: { quotation: { lead: { branchId } } },
      include: { payments: true },
    });

    let revenue = 0;
    let costs = 0;
    for (const booking of bookings) {
      for (const payment of booking.payments) {
        if (!payment.paidAt) continue;
        const amt = Number(payment.amount);
        if (payment.type === 'CLIENT_RECEIPT') revenue += amt;
        if (payment.type === 'DMC_PAYABLE' || payment.type === 'COMMISSION' || payment.type === 'REFUND') costs += amt;
      }
    }

    return { branchId, bookingCount: bookings.length, revenue, costs, grossProfit: revenue - costs };
  }
}
