import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateBookingDto } from './dto/booking.dto';

@Injectable()
export class BookingsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(filter: { branchId?: string; consultantId?: string }) {
    return this.prisma.booking.findMany({
      where: {
        quotation: {
          consultantId: filter.consultantId,
          lead: filter.branchId ? { branchId: filter.branchId } : undefined,
        },
      },
      include: { quotation: { include: { lead: true } }, payments: true },
      orderBy: { departureDate: 'asc' },
    });
  }

  async findOne(id: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id },
      include: { quotation: { include: { lead: true, items: true } }, payments: true },
    });
    if (!booking) throw new NotFoundException('Booking not found');
    return booking;
  }

  // Booking confirmed -> vouchers/invoices generated -> auto-appears on the Departure
  // Calendar (spec Section 6 step 8) since Calendar just reads Booking.departureDate directly.
  async create(dto: CreateBookingDto) {
    const quotation = await this.prisma.quotation.findUnique({ where: { id: dto.quotationId } });
    if (!quotation) throw new NotFoundException('Quotation not found');
    if (quotation.status !== 'SENT') {
      throw new BadRequestException('Only an approved & sent quotation can be converted into a booking');
    }

    return this.prisma.booking.create({
      data: {
        quotationId: dto.quotationId,
        status: 'CONFIRMED',
        departureDate: new Date(dto.departureDate),
        returnDate: dto.returnDate ? new Date(dto.returnDate) : undefined,
        voucherUrl: `/bookings/placeholder-voucher`,
        invoiceUrl: `/bookings/placeholder-invoice`,
      },
    });
  }
}
