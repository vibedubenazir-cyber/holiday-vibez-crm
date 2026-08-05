import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateInvoiceDto } from './dto/invoice.dto';

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
    const invoice = await this.prisma.invoice.create({
      data: {
        bookingId,
        invoiceNo,
        type: dto.type,
        amount,
        taxAmount: dto.taxAmount ?? 0,
        currency: booking.quotation.currency,
        pdfUrl: dto.pdfUrl ?? `/invoices/${invoiceNo}/pdf-not-yet-generated`,
        issuedBy,
      },
    });

    await this.notifications.send({
      channel: 'EMAIL',
      triggerType: 'invoice_issued',
      recipient: booking.quotation.lead.email ?? booking.quotation.lead.phone,
      relatedEntity: `booking:${bookingId}`,
      subject: `Your invoice ${invoiceNo} from Holiday Vibez`,
      body: `Hi ${booking.quotation.lead.clientName},\n\nYour invoice ${invoiceNo} for ${booking.quotation.currency} ${amount.toLocaleString('en-IN')} is ready: ${invoice.pdfUrl}\n\nThank you for booking with Holiday Vibez.`,
    });

    return invoice;
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
