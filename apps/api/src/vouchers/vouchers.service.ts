import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateVoucherDto } from './dto/voucher.dto';
import { getPublicCompanyInfo } from '../common/company-info.util';

@Injectable()
export class VouchersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  findAllForBooking(bookingId: string) {
    return this.prisma.voucher.findMany({ where: { bookingId }, orderBy: { issuedAt: 'desc' } });
  }

  async create(bookingId: string, dto: CreateVoucherDto, issuedBy: string, actor: { role: Role; branchId: string | null; id: string }) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { quotation: { include: { lead: true } } },
    });
    if (!booking) throw new NotFoundException('Booking not found');
    this.assertScope(actor, booking.quotation.consultantId, booking.quotation.lead.branchId);

    const refNo = `VCH-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;
    const voucher = await this.prisma.voucher.create({
      data: { bookingId, type: dto.type, refNo, issuedBy },
    });

    // Real, viewable page — id-keyed (not refNo) to match the quotation/
    // invoice public-view pattern; set after creation since the URL needs
    // the generated id.
    const pdfUrl = dto.pdfUrl ?? `${process.env.WEB_ORIGIN}/voucher/${voucher.id}`;
    const updated = await this.prisma.voucher.update({ where: { id: voucher.id }, data: { pdfUrl } });

    await this.notifications.send({
      channel: 'WHATSAPP',
      triggerType: 'voucher_issued',
      recipient: booking.quotation.lead.phone,
      relatedEntity: `booking:${bookingId}`,
      body: `Hi ${booking.quotation.lead.clientName}, your ${dto.type.toLowerCase()} voucher ${refNo} is ready. View it here: ${pdfUrl}`,
    });

    return updated;
  }

  // Called by the unauthenticated public controller — no actor, so this
  // must never return anything beyond what a customer holding this exact
  // link should see.
  async publicView(id: string) {
    const voucher = await this.prisma.voucher.findUnique({
      where: { id },
      include: { booking: { include: { quotation: { include: { lead: true, items: true } } } } },
    });
    if (!voucher) throw new NotFoundException('Voucher not found');

    const lead = voucher.booking.quotation.lead;
    return {
      refNo: voucher.refNo,
      type: voucher.type,
      issuedAt: voucher.issuedAt,
      departureDate: voucher.booking.departureDate,
      client: { name: lead.clientName, phone: lead.phone, email: lead.email, destination: lead.destination },
      items: voucher.booking.quotation.items.map((item) => ({ description: item.description, quantity: item.quantity })),
      company: await getPublicCompanyInfo(this.prisma),
    };
  }

  private assertScope(actor: { role: Role; branchId: string | null; id: string }, consultantId: string, leadBranchId: string) {
    if (actor.role === Role.TRAVEL_CONSULTANT && actor.id !== consultantId) {
      throw new ForbiddenException('You can only manage vouchers for your own bookings');
    }
    if (actor.role === Role.BRANCH_MANAGER && actor.branchId !== leadBranchId) {
      throw new ForbiddenException("You can only manage vouchers for your own branch's bookings");
    }
  }
}
