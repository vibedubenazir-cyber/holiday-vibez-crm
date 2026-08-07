import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateInvoiceDto } from './dto/invoice.dto';
import { getPublicCompanyInfo } from '../common/company-info.util';

@Injectable()
export class InvoicesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  findAllForBooking(bookingId: string) {
    return this.prisma.invoice.findMany({ where: { bookingId }, orderBy: { issuedAt: 'desc' } });
  }

  async create(bookingId: string, dto: CreateInvoiceDto, issuedBy: string, actor: { role: Role; branchId: string | null; id: string }) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { quotation: { include: { lead: true } } },
    });
    if (!booking) throw new NotFoundException('Booking not found');
    this.assertScope(actor, booking.quotation.consultantId, booking.quotation.lead.branchId);

    const invoiceNo = `INV-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;
    // GST-compliant structured invoicing (spec Section 12) — amount defaults to the
    // quotation total so it stays consistent with what the customer already agreed to.
    const amount = dto.amount ?? Number(booking.quotation.totalAmount);
    const gstRate = dto.gstRate ?? 0;
    // taxAmount is derived from gstRate unless the caller passes an explicit
    // override (e.g. a manually-adjusted invoice).
    const taxAmount = dto.taxAmount ?? Math.round(amount * (gstRate / 100) * 100) / 100;
    const invoice = await this.prisma.invoice.create({
      data: {
        bookingId,
        invoiceNo,
        type: dto.type,
        amount,
        gstRate,
        taxAmount,
        customerGstin: dto.customerGstin,
        currency: booking.quotation.currency,
        issuedBy,
      },
    });

    // Real, viewable page — id-keyed, set after creation since the URL
    // needs the generated id (same pattern as vouchers/quotations).
    const pdfUrl = dto.pdfUrl ?? `${process.env.WEB_ORIGIN}/invoice/${invoice.id}`;
    const updated = await this.prisma.invoice.update({ where: { id: invoice.id }, data: { pdfUrl } });

    await this.notifications.send({
      channel: 'EMAIL',
      triggerType: 'invoice_issued',
      recipient: booking.quotation.lead.email ?? booking.quotation.lead.phone,
      relatedEntity: `booking:${bookingId}`,
      subject: `Your invoice ${invoiceNo} from Holiday Vibez`,
      body: `Hi ${booking.quotation.lead.clientName},\n\nYour invoice ${invoiceNo} for ${booking.quotation.currency} ${amount.toLocaleString('en-IN')} is ready: ${pdfUrl}\n\nThank you for booking with Holiday Vibez.`,
    });

    return updated;
  }

  // Called by the unauthenticated public controller — no actor, so this
  // must never return anything beyond what a customer holding this exact
  // link should see.
  async publicView(id: string) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id },
      include: { booking: { include: { quotation: { include: { lead: true } } } } },
    });
    if (!invoice) throw new NotFoundException('Invoice not found');

    const lead = invoice.booking.quotation.lead;
    return {
      invoiceNo: invoice.invoiceNo,
      type: invoice.type,
      issuedAt: invoice.issuedAt,
      amount: Number(invoice.amount),
      gstRate: Number(invoice.gstRate),
      taxAmount: Number(invoice.taxAmount),
      customerGstin: invoice.customerGstin,
      currency: invoice.currency,
      client: { name: lead.clientName, phone: lead.phone, email: lead.email, destination: lead.destination },
      company: await getPublicCompanyInfo(this.prisma),
    };
  }

  private assertScope(actor: { role: Role; branchId: string | null; id: string }, consultantId: string, leadBranchId: string) {
    if (actor.role === Role.TRAVEL_CONSULTANT && actor.id !== consultantId) {
      throw new ForbiddenException('You can only manage invoices for your own bookings');
    }
    if (actor.role === Role.BRANCH_MANAGER && actor.branchId !== leadBranchId) {
      throw new ForbiddenException("You can only manage invoices for your own branch's bookings");
    }
  }
}
