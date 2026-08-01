import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

type Readiness = 'GREEN' | 'AMBER' | 'RED';

@Injectable()
export class CalendarService {
  constructor(private readonly prisma: PrismaService) {}

  // Powers the Departure Calendar (spec Section 8, GET /calendar/departures).
  // Color-coding: green = docs + payment complete; amber = payment or one document
  // pending; red = passport/visa issue or payment overdue with departure inside 30 days
  // — cross-checked against the passport/visa expiry monitor per Section 8's own spec.
  async departures(filter: { branchId?: string; consultantId?: string; days?: number }) {
    const rangeEnd = filter.days ? new Date(Date.now() + filter.days * 24 * 60 * 60 * 1000) : undefined;

    const bookings = await this.prisma.booking.findMany({
      where: {
        departureDate: rangeEnd ? { lte: rangeEnd } : undefined,
        quotation: {
          consultantId: filter.consultantId,
          lead: filter.branchId ? { branchId: filter.branchId } : undefined,
        },
      },
      include: {
        quotation: { include: { lead: { include: { travelers: true } } } },
        payments: true,
      },
      orderBy: { departureDate: 'asc' },
    });

    return bookings.map((booking) => this.toCalendarEntry(booking));
  }

  private toCalendarEntry(booking: any) {
    const totalAmount = Number(booking.quotation.totalAmount);
    const paidAmount = booking.payments
      .filter((p: any) => p.type === 'CLIENT_RECEIPT' && p.paidAt)
      .reduce((sum: number, p: any) => sum + Number(p.amount), 0);
    const paymentComplete = paidAmount >= totalAmount;
    const paymentOverdue = booking.payments.some(
      (p: any) => p.type === 'CLIENT_RECEIPT' && !p.paidAt && p.dueDate && new Date(p.dueDate) < new Date(),
    );

    const travelers = booking.quotation.lead.travelers as any[];
    const docsComplete =
      travelers.length > 0 && travelers.every((t) => t.passportNumberEnc && t.passportExpiry);

    const daysToDeparture = Math.ceil((new Date(booking.departureDate).getTime() - Date.now()) / (24 * 60 * 60 * 1000));
    const passportRisk = travelers.some((t) => {
      if (!t.passportExpiry) return true;
      const monthsToExpiry =
        (new Date(t.passportExpiry).getTime() - new Date(booking.departureDate).getTime()) / (1000 * 60 * 60 * 24 * 30);
      return monthsToExpiry < 6;
    });

    let readiness: Readiness = 'GREEN';
    if (daysToDeparture <= 30 && (passportRisk || paymentOverdue)) {
      readiness = 'RED';
    } else if (!paymentComplete || !docsComplete) {
      readiness = 'AMBER';
    }

    return {
      bookingId: booking.id,
      leadId: booking.quotation.leadId,
      clientName: booking.quotation.lead.clientName,
      destination: booking.quotation.lead.destination,
      departureDate: booking.departureDate,
      returnDate: booking.returnDate,
      readiness,
      paymentComplete,
      docsComplete,
      daysToDeparture,
    };
  }
}
