import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { BookingStatus, Role } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateBookingDto } from './dto/booking.dto';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Renders an instant as "YYYY-MM-DD HH:mm <tz>" in the given IANA timezone —
 * the destination's wall-clock time, matching what the traveller sees on
 * FlightStatusCard and their boarding pass, not the raw UTC instant.
 */
function stampInTimezone(date: Date, timezone: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')} ${get('hour')}:${get('minute')} ${timezone}`;
}

// PENDING -> CONFIRMED -> COMPLETED is the normal lifecycle; either open state
// can be CANCELLED. CANCELLED and COMPLETED are terminal — moving a booking
// backward out of either (e.g. CANCELLED -> CONFIRMED) previously had no
// guard, and sendEngagementReminders() reads live `status` to decide who gets
// pre-departure/review-request WhatsApp messages, so a backward transition
// could resurrect reminders for a trip that was cancelled and never happened.
const ALLOWED_STATUS_TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
  PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
};

@Injectable()
export class BookingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

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
  async create(dto: CreateBookingDto, actor: { role: Role; id: string; branchId: string | null }) {
    const quotation = await this.prisma.quotation.findUnique({ where: { id: dto.quotationId }, include: { lead: true } });
    if (!quotation) throw new NotFoundException('Quotation not found');
    if (quotation.status !== 'SENT') {
      throw new BadRequestException('Only an approved & sent quotation can be converted into a booking');
    }
    this.assertActorScope(actor, quotation.consultantId, quotation.lead.branchId);

    // Booking.voucherUrl/invoiceUrl are unused legacy columns from before the
    // real Voucher/Invoice models existed — the real documents (with real
    // viewable pdfUrl links) are created separately via VouchersService/
    // InvoicesService, not stamped here.
    try {
      return await this.prisma.booking.create({
        data: {
          quotationId: dto.quotationId,
          status: 'PENDING',
          departureDate: new Date(dto.departureDate),
          returnDate: dto.returnDate ? new Date(dto.returnDate) : undefined,
        },
      });
    } catch (err) {
      // Unique constraint on quotationId (P2002) — a booking for this quotation
      // already exists, most likely from a double-click or two staff racing.
      if (err && typeof err === 'object' && 'code' in err && err.code === 'P2002') {
        throw new ConflictException('A booking already exists for this quotation');
      }
      throw err;
    }
  }

  async updateStatus(id: string, status: BookingStatus, actor: { role: Role; id: string; branchId: string | null }) {
    const booking = await this.prisma.booking.findUnique({ where: { id }, include: { quotation: { include: { lead: true } } } });
    if (!booking) throw new NotFoundException('Booking not found');
    this.assertActorScope(actor, booking.quotation.consultantId, booking.quotation.lead.branchId);
    if (status !== booking.status && !ALLOWED_STATUS_TRANSITIONS[booking.status].includes(status)) {
      throw new BadRequestException(`Cannot move a booking from ${booking.status} to ${status}`);
    }
    return this.prisma.booking.update({ where: { id }, data: { status } });
  }

  private assertActorScope(actor: { role: Role; id: string; branchId: string | null }, consultantId: string, leadBranchId: string) {
    if (actor.role === Role.TRAVEL_CONSULTANT && actor.id !== consultantId) {
      throw new ForbiddenException('You can only act on your own bookings');
    }
    if (actor.role === Role.BRANCH_MANAGER && actor.branchId !== leadBranchId) {
      throw new ForbiddenException("You can only act on your own branch's bookings");
    }
  }

  // Scheduled daily (see jobs/jobs.scheduler.ts's "engagement-reminders") — the
  // Automation Rules engine only reacts to CRUD events (lead created, quotation
  // sent, etc.), it has no date-based trigger, so these three date-driven
  // WhatsApp nudges live here instead. Dedup is done by checking for an
  // existing Notification with the same relatedEntity rather than adding new
  // schema fields — each reminder type fires exactly once per booking/payment.
  async sendEngagementReminders() {
    const now = new Date();
    const countdownCount = await this.sendDepartureCountdowns(now);
    const paymentDueCount = await this.sendPaymentDueReminders(now);
    const reviewRequestCount = await this.sendPostTripReviewRequests(now);
    return { countdown: countdownCount, paymentDue: paymentDueCount, reviewRequests: reviewRequestCount };
  }

  private async alreadySent(relatedEntity: string) {
    const existing = await this.prisma.notification.findFirst({ where: { relatedEntity } });
    return !!existing;
  }

  // The countdown milestones, and the voice of each. Excitement builds as the
  // day approaches; the last two carry the practical reminders because that's
  // when someone actually packs.
  private static readonly COUNTDOWN_DAYS = [15, 10, 5, 3, 1] as const;

  private countdownMessage(days: number, first: string, destination: string, flightLine: string, url: string): { subject: string; body: string } {
    const name = first ? `, ${first}` : '';
    switch (days) {
      case 15:
        return {
          subject: `✈️ 15 days to ${destination}!`,
          body: `Hi${name}! 🌴 Just 15 days until ${destination}. Your trip is booked, confirmed and waiting for you — we're already excited on your behalf. Nothing to do yet except look forward to it.\n\nYour full plan lives here: ${url}`,
        };
      case 10:
        return {
          subject: `10 days to ${destination} 🌞`,
          body: `Hi${name}! 10 days to go. ${destination} is getting ready for you — a good moment to check your passport is where you think it is. 😄\n\nEverything about your trip: ${url}`,
        };
      case 5:
        return {
          subject: `5 days — nearly there!`,
          body: `Hi${name}! Only 5 days now. ✨ Your hotels, drivers and day-by-day plan are all arranged — take a look and start dreaming.\n\nYour trip, day by day: ${url}`,
        };
      case 3:
        return {
          subject: `3 days to ${destination} ✈️`,
          body: `Hi${name}! 3 days! Time to pack. Keep your passport and documents handy — everything else is taken care of.\n\nAdd your documents to your trip app so they're always with you: ${url}`,
        };
      default:
        return {
          subject: `Tomorrow's the day! 🎉`,
          body: `Hi${name}! Tomorrow's the day — ${destination} is waiting for you! 🎉${flightLine}\n\nYour driver details, hotel check-in and 24/7 support number are all in your trip app, and it works even with no signal.\n\nOpen your trip app: ${url}\n\nHave a wonderful trip — we're with you the whole way.`,
        };
    }
  }

  /**
   * The excitement countdown: a message at 15, 10, 5, 3 and 1 days before
   * departure, to every traveller on the booking, on every channel we hold.
   *
   * Deduped per booking + milestone + recipient (the same pattern as the app
   * invite), so a job that runs six-hourly still sends each milestone once —
   * and a milestone missed entirely (job down that day) stays missed rather
   * than arriving late and wrong.
   */
  private async sendDepartureCountdowns(now: Date) {
    const windowEnd = new Date(now.getTime() + 16 * MS_PER_DAY);
    const upcoming = await this.prisma.booking.findMany({
      where: { status: 'CONFIRMED', departureDate: { gte: now, lte: windowEnd } },
      include: {
        quotation: { include: { lead: { include: { travelers: true } } } },
        flights: { orderBy: { scheduledDeparture: 'asc' } },
      },
    });

    // Whole calendar days between today and departure, both truncated to UTC
    // dates — departureDate is stored as a UTC-midnight date, so mixing in
    // time-of-day would make the milestone fire a day early in the evening.
    const todayUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());

    let sent = 0;
    for (const booking of upcoming) {
      const dep = new Date(booking.departureDate);
      const depUtc = Date.UTC(dep.getUTCFullYear(), dep.getUTCMonth(), dep.getUTCDate());
      const daysUntil = Math.round((depUtc - todayUtc) / MS_PER_DAY);
      if (!BookingsService.COUNTDOWN_DAYS.includes(daysUntil as 15 | 10 | 5 | 3 | 1)) continue;

      const lead = booking.quotation.lead;
      const destination = lead.destination || 'your destination';
      const url = `${process.env.WEB_ORIGIN}/trip`;

      // The day-before message names their flight when we know it, in the
      // destination's wall-clock time — the same time the traveller sees on
      // FlightStatusCard, not the raw UTC instant the flight is stored in.
      const firstFlight = booking.flights.find((f) => f.status !== 'CANCELLED');
      let flightLine = '';
      if (daysUntil === 1 && firstFlight) {
        let when = '';
        if (firstFlight.scheduledDeparture) {
          const plan = await this.prisma.itineraryPlan.findFirst({
            where: { leadId: lead.id, timezone: { not: null } },
            orderBy: { updatedAt: 'desc' },
            select: { timezone: true },
          });
          when = plan?.timezone
            ? ` departs ${stampInTimezone(new Date(firstFlight.scheduledDeparture), plan.timezone)}`
            : ` departs ${new Date(firstFlight.scheduledDeparture).toISOString().replace('T', ' ').slice(0, 16)} UTC`;
        }
        flightLine = `\n\nFlight ${firstFlight.flightNumber}${when} — we'll message you if anything changes.`;
      }

      // Every traveller, both channels — same recipient logic as the app
      // invite, falling back to the lead contact only when no traveller has
      // details of their own.
      const recipients: { channel: 'WHATSAPP' | 'EMAIL'; to: string; name: string }[] = [];
      for (const traveller of lead.travelers) {
        if (traveller.phone) recipients.push({ channel: 'WHATSAPP', to: traveller.phone, name: traveller.name });
        if (traveller.email) recipients.push({ channel: 'EMAIL', to: traveller.email, name: traveller.name });
      }
      if (recipients.length === 0) {
        if (lead.phone) recipients.push({ channel: 'WHATSAPP', to: lead.phone, name: lead.clientName });
        if (lead.email) recipients.push({ channel: 'EMAIL', to: lead.email, name: lead.clientName });
      }

      for (const { channel, to, name } of recipients) {
        const relatedEntity = `booking:${booking.id}:countdown:${daysUntil}:${to}`;
        if (await this.alreadySent(relatedEntity)) continue;
        const first = name.trim().split(/\s+/)[0] ?? '';
        const { subject, body } = this.countdownMessage(daysUntil, first, destination, flightLine, url);
        await this.notifications.send({
          channel,
          triggerType: 'departure_countdown',
          recipient: to,
          relatedEntity,
          subject,
          body,
        });
        sent++;
      }
    }
    return sent;
  }

  private async sendPaymentDueReminders(now: Date) {
    const windowEnd = new Date(now.getTime() + 1 * MS_PER_DAY);
    const duePayments = await this.prisma.payment.findMany({
      where: { paidAt: null, dueDate: { gte: now, lte: windowEnd } },
      include: { booking: { include: { quotation: { include: { lead: true } } } } },
    });
    let sent = 0;
    for (const payment of duePayments) {
      const relatedEntity = `payment:${payment.id}:due-reminder`;
      if (await this.alreadySent(relatedEntity)) continue;
      const lead = payment.booking.quotation.lead;
      await this.notifications.send({
        channel: 'WHATSAPP',
        triggerType: 'payment_due_reminder',
        recipient: lead.phone,
        relatedEntity,
        body: `Hi ${lead.clientName}, a payment of ₹${Number(payment.amount).toLocaleString('en-IN')} is due on ${new Date(payment.dueDate!).toLocaleDateString()} for your trip to ${lead.destination}.`,
      });
      sent++;
    }
    return sent;
  }

  private async sendPostTripReviewRequests(now: Date) {
    const windowStart = new Date(now.getTime() - 3 * MS_PER_DAY);
    const windowEnd = new Date(now.getTime() - 1 * MS_PER_DAY);
    const recentlyDeparted = await this.prisma.booking.findMany({
      where: { departureDate: { gte: windowStart, lte: windowEnd }, status: { in: ['CONFIRMED', 'COMPLETED'] } },
      include: { quotation: { include: { lead: true } }, reviews: true },
    });
    let sent = 0;
    for (const booking of recentlyDeparted) {
      if (booking.reviews.length > 0) continue;
      const relatedEntity = `booking:${booking.id}:review-request`;
      if (await this.alreadySent(relatedEntity)) continue;
      const lead = booking.quotation.lead;
      await this.notifications.send({
        channel: 'WHATSAPP',
        triggerType: 'post_trip_review_request',
        recipient: lead.phone,
        relatedEntity,
        body: `Hi ${lead.clientName}, we hope you enjoyed your trip to ${lead.destination}! We'd love to hear about your experience — could you leave us a quick review?`,
      });
      sent++;
    }
    return sent;
  }
}
