import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateVoucherDto } from './dto/voucher.dto';

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
      data: {
        bookingId,
        type: dto.type,
        refNo,
        pdfUrl: dto.pdfUrl ?? `/vouchers/${refNo}/pdf-not-yet-generated`,
        issuedBy,
      },
    });

    await this.notifications.send({
      channel: 'WHATSAPP',
      triggerType: 'voucher_issued',
      recipient: booking.quotation.lead.phone,
      relatedEntity: `booking:${bookingId}`,
      body: `Hi ${booking.quotation.lead.clientName}, your ${dto.type.toLowerCase()} voucher ${refNo} is ready. View it here: ${voucher.pdfUrl}`,
    });

    return voucher;
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
