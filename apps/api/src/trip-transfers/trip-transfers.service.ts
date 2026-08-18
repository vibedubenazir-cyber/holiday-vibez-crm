import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Role, TripTransfer } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateTripTransferDto, UpdateTripTransferDto } from './dto/trip-transfer.dto';

type Actor = { id: string; role: Role; branchId: string | null };

const BOOKING_SCOPE = {
  quotation: { include: { lead: { include: { travelers: true } } } },
} as const;

const TYPE_LABELS: Record<string, string> = {
  ARRIVAL_PICKUP: 'airport pickup',
  DEPARTURE_DROP: 'airport drop',
  INTERCITY: 'intercity transfer',
  DAY_TRANSFER: 'day transfer',
};

/**
 * Staff CRUD for a booking's ground transfers, and the notification that goes
 * with it.
 *
 * The traveller app reads transfers offline from a cached copy, so a driver or
 * pickup-time change made in the CRM would otherwise sit unseen until they
 * next opened the app with signal — which, abroad, may be never. Every change
 * therefore pushes a WhatsApp message: it arrives on roaming without the app
 * installed or open, which is the only guarantee that matters when a pickup
 * moves.
 */
@Injectable()
export class TripTransfersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async findAll(bookingId: string, actor: Actor) {
    await this.loadBooking(bookingId, actor);
    return this.prisma.tripTransfer.findMany({ where: { bookingId }, orderBy: { scheduledAt: 'asc' } });
  }

  async create(bookingId: string, dto: CreateTripTransferDto, actor: Actor) {
    await this.loadBooking(bookingId, actor);
    const transfer = await this.prisma.tripTransfer.create({
      data: { ...dto, bookingId, scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : null },
    });
    await this.notifyTraveller(bookingId, transfer, 'added');
    return transfer;
  }

  async update(id: string, dto: UpdateTripTransferDto, actor: Actor) {
    const existing = await this.prisma.tripTransfer.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Transfer not found');
    await this.loadBooking(existing.bookingId, actor);

    const { changeReason, ...data } = dto;
    const transfer = await this.prisma.tripTransfer.update({
      where: { id },
      data: { ...data, ...(dto.scheduledAt ? { scheduledAt: new Date(dto.scheduledAt) } : {}) },
    });

    // Only tell the traveller when something they'd act on actually moved.
    // Fixing a typo in an internal note shouldn't buzz someone's phone abroad.
    if (this.travellerVisibleChange(existing, transfer) || changeReason) {
      await this.notifyTraveller(existing.bookingId, transfer, 'updated', changeReason);
    }
    return transfer;
  }

  async remove(id: string, actor: Actor) {
    const existing = await this.prisma.tripTransfer.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Transfer not found');
    await this.loadBooking(existing.bookingId, actor);
    await this.prisma.tripTransfer.delete({ where: { id } });
    return { ok: true };
  }

  /** Fields the traveller reads off their phone; `notes` is shown to them too. */
  private travellerVisibleChange(before: TripTransfer, after: TripTransfer): boolean {
    const keys = [
      'scheduledAt',
      'fromLocation',
      'toLocation',
      'driverName',
      'driverPhone',
      'vehicleNumber',
      'vehicleType',
      'notes',
    ] as const;
    return keys.some((key) => {
      const a = before[key];
      const b = after[key];
      if (a instanceof Date || b instanceof Date) {
        return new Date(a as Date).getTime() !== new Date(b as Date).getTime();
      }
      return a !== b;
    });
  }

  private async notifyTraveller(
    bookingId: string,
    transfer: TripTransfer,
    verb: 'added' | 'updated',
    reason?: string,
  ) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: BOOKING_SCOPE,
    });
    const lead = booking?.quotation.lead;
    if (!lead) return;

    // Every traveller on the booking, on both channels we hold — a driver
    // change matters to whoever is standing at the kerb, and email survives a
    // switched-off number with a travel SIM in it.
    const recipients: { channel: 'WHATSAPP' | 'EMAIL'; to: string }[] = [];
    for (const traveller of lead.travelers) {
      if (traveller.phone) recipients.push({ channel: 'WHATSAPP', to: traveller.phone });
      if (traveller.email) recipients.push({ channel: 'EMAIL', to: traveller.email });
    }
    if (recipients.length === 0) {
      if (lead.phone) recipients.push({ channel: 'WHATSAPP', to: lead.phone });
      if (lead.email) recipients.push({ channel: 'EMAIL', to: lead.email });
    }
    if (recipients.length === 0) return;

    const label = TYPE_LABELS[transfer.type] ?? 'transfer';
    const when = transfer.scheduledAt
      ? new Date(transfer.scheduledAt).toISOString().replace('T', ' ').slice(0, 16) + ' UTC'
      : 'a time to be confirmed';

    const lines = [
      `Hi ${lead.clientName}, your ${label} has been ${verb}.`,
      reason ? `\n${reason}` : '',
      `\nWhen: ${when}`,
      transfer.fromLocation ? `\nFrom: ${transfer.fromLocation}` : '',
      transfer.driverName ? `\nDriver: ${transfer.driverName}` : '',
      transfer.driverPhone ? ` (${transfer.driverPhone})` : '',
      `\n\nFull details in your trip app: ${process.env.WEB_ORIGIN}/trip`,
    ];

    for (const { channel, to } of recipients) {
      await this.notifications.send({
        channel,
        triggerType: 'trip_transfer_changed',
        recipient: to,
        // Deliberately not deduped on relatedEntity: unlike the one-shot
        // engagement reminders, a transfer can legitimately change more than
        // once and the traveller needs to hear about each one.
        relatedEntity: `trip_transfer:${transfer.id}`,
        subject: `Your ${label} has been ${verb}`,
        body: lines.filter(Boolean).join(''),
      });
    }
  }

  private async loadBooking(bookingId: string, actor: Actor) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: BOOKING_SCOPE,
    });
    if (!booking) throw new NotFoundException('Booking not found');
    if (actor.role === Role.TRAVEL_CONSULTANT && actor.id !== booking.quotation.consultantId) {
      throw new ForbiddenException('You can only act on your own bookings');
    }
    if (actor.role === Role.BRANCH_MANAGER && actor.branchId !== booking.quotation.lead.branchId) {
      throw new ForbiddenException("You can only act on your own branch's bookings");
    }
    return booking;
  }
}
