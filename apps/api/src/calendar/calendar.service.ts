import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

type Readiness = 'GREEN' | 'AMBER' | 'RED';

const REMINDER_WINDOW_DAYS = 7;

@Injectable()
export class CalendarService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

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

  // Scheduled daily (see jobs/jobs.scheduler.ts's "consultant-departure-reminders") —
  // the Departure Calendar itself is already correctly scoped per consultant, but
  // nothing previously pushed it to them; this closes that gap the same way
  // compliance-check does for passport/visa risk, reusing the exact readiness
  // computation the calendar page already shows. Fires once per booking (dedup via
  // relatedEntity, same pattern as BookingsService.sendEngagementReminders) as soon
  // as it enters the reminder window, not on every run inside that window.
  async notifyUpcomingDepartures() {
    const windowEnd = new Date(Date.now() + REMINDER_WINDOW_DAYS * 24 * 60 * 60 * 1000);

    const bookings = await this.prisma.booking.findMany({
      where: {
        departureDate: { gte: new Date(), lte: windowEnd },
      },
      include: {
        quotation: { include: { lead: { include: { travelers: true } } } },
        payments: true,
      },
    });

    let sent = 0;
    for (const booking of bookings) {
      // Quotation.consultantId is non-nullable, so every booking already has
      // an owner — no filtering needed beyond the date window above.
      const consultantId = booking.quotation.consultantId;

      const relatedEntity = `booking:${booking.id}:consultant-departure-reminder`;
      const alreadySent = await this.prisma.notification.findFirst({ where: { relatedEntity } });
      if (alreadySent) continue;

      const entry = this.toCalendarEntry(booking);
      await this.notifications.send({
        channel: 'PUSH',
        triggerType: 'consultant_departure_reminder',
        recipient: consultantId,
        relatedEntity,
        subject: 'Upcoming departure',
        body: `${entry.clientName} → ${entry.destination} departs in ${entry.daysToDeparture} day${entry.daysToDeparture === 1 ? '' : 's'} (readiness: ${entry.readiness}).`,
      });
      sent++;
    }
    return { checked: bookings.length, notified: sent };
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
