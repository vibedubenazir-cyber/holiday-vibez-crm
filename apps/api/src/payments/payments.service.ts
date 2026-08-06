import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreatePaymentDto } from './dto/payment.dto';

const RAZORPAY_API_URL = 'https://api.razorpay.com/v1/payment_links';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(private readonly prisma: PrismaService) {}

  findAll(bookingId?: string, branchId?: string) {
    return this.prisma.payment.findMany({
      where: { bookingId, booking: branchId ? { quotation: { lead: { branchId } } } : undefined },
      orderBy: { createdAt: 'desc' },
    });
  }

  create(dto: CreatePaymentDto) {
    return this.prisma.payment.create({
      data: {
        bookingId: dto.bookingId,
        type: dto.type,
        category: dto.category,
        amount: dto.amount,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
      },
    });
  }

  // Manual/offline reconciliation path (cash, bank transfer already received) —
  // stays trust-based by design, distinct from the real gateway flow below.
  async markPaid(id: string) {
    const payment = await this.prisma.payment.findUnique({ where: { id } });
    if (!payment) throw new NotFoundException('Payment not found');
    if (payment.paidAt) return payment;
    return this.confirmPaid(payment, `MOCK-${Date.now()}`);
  }

  // Real hosted-checkout gateway (spec Section 11: "PCI-scope-free payments via
  // hosted checkout") via Razorpay's Payment Links API — the customer pays on
  // Razorpay's own page, so card data never touches this app. Returns a URL for
  // staff to send the customer (e.g. over WhatsApp); the payment only actually
  // gets marked paid once Razorpay's webhook confirms it (razorpay-webhook.controller.ts),
  // not by this call itself.
  async createPaymentLink(id: string) {
    if (!process.env.PAYMENT_GATEWAY_KEY_ID || !process.env.PAYMENT_GATEWAY_KEY) {
      throw new BadRequestException('Payment gateway not configured — use "Mark paid" for offline/manual payments instead');
    }

    const payment = await this.prisma.payment.findUnique({
      where: { id },
      include: { booking: { include: { quotation: { include: { lead: true } } } } },
    });
    if (!payment) throw new NotFoundException('Payment not found');
    if (payment.paidAt) throw new BadRequestException('Payment is already paid');

    const lead = payment.booking.quotation.lead;
    const auth = Buffer.from(`${process.env.PAYMENT_GATEWAY_KEY_ID}:${process.env.PAYMENT_GATEWAY_KEY}`).toString('base64');

    const res = await fetch(RAZORPAY_API_URL, {
      method: 'POST',
      headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount: Math.round(Number(payment.amount) * 100), // paise
        currency: 'INR',
        reference_id: payment.id,
        description: `Holiday Vibez — ${payment.type.replace(/_/g, ' ').toLowerCase()} for ${lead.destination}`,
        customer: {
          name: lead.clientName,
          contact: lead.phone,
          email: lead.email ?? undefined,
        },
        notify: { sms: false, email: false }, // we send the link ourselves, over WhatsApp/email
      }),
    });

    const body = await res.json().catch(() => null);
    if (!res.ok) {
      this.logger.error(`Razorpay payment link creation failed (${res.status}): ${JSON.stringify(body)}`);
      throw new BadRequestException('Failed to create payment link');
    }

    const updated = await this.prisma.payment.update({
      where: { id },
      data: { gatewayLinkId: body.id, gatewayLinkUrl: body.short_url },
    });
    return updated;
  }

  // Shared by the manual mark-paid path and the real Razorpay webhook — both
  // "paid" outcomes flow through exactly the same target-crediting logic, so
  // the two paths can never drift apart on what actually happens on payment.
  private async confirmPaid(payment: { id: string; bookingId: string; type: string; amount: unknown }, gatewayRef: string) {
    const updated = await this.prisma.payment.update({
      where: { id: payment.id },
      data: { paidAt: new Date(), gatewayRef },
    });

    if (payment.type === 'CLIENT_RECEIPT') {
      await this.applyToTargets(payment.bookingId, Number(payment.amount));
    }
    return updated;
  }

  // Called by razorpay-webhook.controller.ts once Razorpay confirms a payment
  // link was actually paid.
  async confirmPaidByGatewayLinkId(gatewayLinkId: string, gatewayPaymentId: string) {
    const payment = await this.prisma.payment.findFirst({ where: { gatewayLinkId } });
    if (!payment || payment.paidAt) return null;
    return this.confirmPaid(payment, gatewayPaymentId);
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
    const costsByCategory: Record<string, number> = {};
    for (const booking of bookings) {
      for (const payment of booking.payments) {
        if (!payment.paidAt) continue;
        const amt = Number(payment.amount);
        if (payment.type === 'CLIENT_RECEIPT') revenue += amt;
        if (payment.type === 'DMC_PAYABLE' || payment.type === 'COMMISSION' || payment.type === 'REFUND') {
          costs += amt;
          const key = payment.category ?? 'UNCATEGORIZED';
          costsByCategory[key] = (costsByCategory[key] ?? 0) + amt;
        }
      }
    }

    return {
      branchId,
      bookingCount: bookings.length,
      revenue,
      costs,
      grossProfit: revenue - costs,
      costsByCategory: Object.entries(costsByCategory).map(([category, total]) => ({ category, total })),
    };
  }
}
