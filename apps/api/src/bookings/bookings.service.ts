import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { BookingStatus, Role } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateBookingDto } from './dto/booking.dto';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

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
    const preDepartureCount = await this.sendPreDepartureReminders(now);
    const paymentDueCount = await this.sendPaymentDueReminders(now);
    const reviewRequestCount = await this.sendPostTripReviewRequests(now);
    return { preDeparture: preDepartureCount, paymentDue: paymentDueCount, reviewRequests: reviewRequestCount };
  }

  private async alreadySent(relatedEntity: string) {
    const existing = await this.prisma.notification.findFirst({ where: { relatedEntity } });
    return !!existing;
  }

  private async sendPreDepartureReminders(now: Date) {
    const windowEnd = new Date(now.getTime() + 3 * MS_PER_DAY);
    const upcoming = await this.prisma.booking.findMany({
      where: { status: 'CONFIRMED', departureDate: { gte: now, lte: windowEnd } },
      include: { quotation: { include: { lead: true } } },
    });
    let sent = 0;
    for (const booking of upcoming) {
      const relatedEntity = `booking:${booking.id}:pre-departure`;
      if (await this.alreadySent(relatedEntity)) continue;
      const lead = booking.quotation.lead;
      await this.notifications.send({
        channel: 'WHATSAPP',
        triggerType: 'pre_departure_reminder',
        recipient: lead.phone,
        relatedEntity,
        body: `Hi ${lead.clientName}, your trip to ${lead.destination} departs on ${new Date(booking.departureDate).toLocaleDateString()}. Please keep your travel documents ready — safe travels!`,
      });
      sent++;
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
