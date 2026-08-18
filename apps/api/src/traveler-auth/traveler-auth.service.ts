import { BadRequestException, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { BookingStatus } from '@prisma/client';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { normalizePhone } from '../notifications/phone.util';

// A traveller stays signed in for the length of a trip plus a long tail, so
// they aren't re-authenticating at an airport with no signal. Revocation is
// available server-side (TravelerSession.revokedAt) if a device is lost.
const SESSION_TTL_DAYS = 180;
const OTP_TTL_MINUTES = 10;
const MAX_OTP_ATTEMPTS = 5;
// Throttle per identifier so the endpoint can't be used to spam someone's
// phone (or to enumerate which numbers belong to a paying customer).
const RESEND_COOLDOWN_SECONDS = 60;

// Session tokens are 32 random bytes, so a plain digest is unreversible by
// brute force and needs no key.
function sha256(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

// OTPs are only 6 digits — the entire keyspace is a million values, which a
// plain SHA-256 column would let anyone with database read reverse instantly
// from a precomputed table. Keying the digest to a server-side secret means a
// DB dump alone is not enough to recover a live code.
function hmacOtp(code: string): string {
  const secret = process.env.FIELD_ENCRYPTION_KEY ?? 'dev-only-32-byte-key-not-for-prod!!';
  return crypto.createHmac('sha256', secret).update(code).digest('hex');
}

/**
 * Authentication for the traveller companion PWA. Deliberately separate from
 * the staff auth stack: a traveller is not a `User`, has no password, and
 * never gets a staff JWT. They prove identity by receiving a one-time code on
 * the phone/email already recorded against their Traveler row — so access is
 * bounded by data the consultant entered, not by anything the traveller can
 * assert about themselves.
 *
 * Neither the OTP nor the session token is ever stored in recoverable form —
 * see the two digest helpers above for why they use different schemes. This
 * matters more here than for staff logins because the traveller app fronts
 * passports and tickets.
 */
@Injectable()
export class TravelerAuthService {
  private readonly logger = new Logger(TravelerAuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  private isEmail(identifier: string): boolean {
    return identifier.includes('@');
  }

  /** Phone → digits only; email → lowercased. Mirrors how leads/travelers are matched elsewhere. */
  private normalize(identifier: string): string {
    const trimmed = identifier.trim();
    return this.isEmail(trimmed) ? trimmed.toLowerCase() : normalizePhone(trimmed);
  }

  /**
   * Finds the traveller + booking this identifier is entitled to open, or null.
   *
   * Only bookings that are actually paid for qualify — the app is a
   * post-payment deliverable, and gating on payment also means an unpaid
   * enquiry's contact details can't be used to fish for trip data. Phone
   * matching compares the last 10 digits because stored numbers vary between
   * "9876543210" and "+91-98765-43210".
   */
  private async findEligible(identifier: string) {
    const normalized = this.normalize(identifier);
    if (!normalized) return null;

    // Query from the booking side, not the traveller side. Phone numbers are
    // stored in mixed formats ("9876543210" vs "+91-98765-43210") so the
    // last-10-digit comparison has to happen in JS — and doing that over every
    // Traveler row would be a full-table scan. Bookings that are both
    // non-cancelled and actually paid are a much smaller set, and they're
    // exactly the ones eligible anyway.
    const bookings = await this.prisma.booking.findMany({
      where: {
        status: { not: BookingStatus.CANCELLED },
        payments: { some: { paidAt: { not: null } } },
      },
      include: {
        quotation: { include: { lead: { include: { travelers: true } } } },
      },
      orderBy: { departureDate: 'desc' },
    });

    const suffix = normalized.slice(-10);
    for (const booking of bookings) {
      for (const traveler of booking.quotation.lead.travelers) {
        if (this.isEmail(normalized)) {
          if (traveler.email?.trim().toLowerCase() === normalized) return { traveler, booking };
        } else {
          const phone = traveler.phone ? normalizePhone(traveler.phone) : '';
          if (phone && phone.slice(-10) === suffix) return { traveler, booking };
        }
      }
    }
    return null;
  }

  async requestOtp(identifier: string) {
    const normalized = this.normalize(identifier);
    if (!normalized) throw new BadRequestException('Enter the phone number or email on your booking');

    const recent = await this.prisma.travelerOtp.findFirst({
      where: {
        identifier: normalized,
        consumedAt: null,
        createdAt: { gt: new Date(Date.now() - RESEND_COOLDOWN_SECONDS * 1000) },
      },
    });
    if (recent) {
      throw new BadRequestException(`Please wait ${RESEND_COOLDOWN_SECONDS} seconds before requesting another code`);
    }

    const eligible = await this.findEligible(normalized);

    // Always report success, whether or not the identifier matched. Saying
    // "no booking found" would turn this endpoint into an oracle for which
    // phone numbers/emails belong to real paying customers.
    if (!eligible) {
      this.logger.warn(`Traveler OTP requested for unknown identifier (${this.isEmail(normalized) ? 'email' : 'phone'})`);
      return { sent: true };
    }

    const code = String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
    await this.prisma.travelerOtp.create({
      data: {
        identifier: normalized,
        codeHash: hmacOtp(code),
        expiresAt: new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000),
      },
    });

    const body = `Your Holiday Vibez trip code is ${code}. It expires in ${OTP_TTL_MINUTES} minutes.`;
    await this.notifications.send({
      channel: this.isEmail(normalized) ? 'EMAIL' : 'WHATSAPP',
      triggerType: 'traveler_app_otp',
      recipient: this.isEmail(normalized) ? normalized : eligible.traveler.phone ?? normalized,
      subject: 'Your Holiday Vibez trip code',
      body,
      relatedEntity: `booking:${eligible.booking.id}`,
    });

    return { sent: true };
  }

  async verifyOtp(identifier: string, code: string) {
    const normalized = this.normalize(identifier);
    const otp = await this.prisma.travelerOtp.findFirst({
      where: { identifier: normalized, consumedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
    });
    if (!otp) throw new UnauthorizedException('That code has expired — request a new one');

    if (otp.attempts >= MAX_OTP_ATTEMPTS) {
      throw new UnauthorizedException('Too many incorrect attempts — request a new code');
    }

    if (otp.codeHash !== hmacOtp(code.trim())) {
      await this.prisma.travelerOtp.update({
        where: { id: otp.id },
        data: { attempts: { increment: 1 } },
      });
      throw new UnauthorizedException('Incorrect code');
    }

    // Re-resolve eligibility at verify time rather than trusting the earlier
    // lookup: a booking could have been cancelled between request and verify.
    const eligible = await this.findEligible(normalized);
    if (!eligible) throw new UnauthorizedException('No active trip found for this contact');

    await this.prisma.travelerOtp.update({ where: { id: otp.id }, data: { consumedAt: new Date() } });

    const token = crypto.randomBytes(32).toString('hex');
    await this.prisma.travelerSession.create({
      data: {
        tokenHash: sha256(token),
        travelerId: eligible.traveler.id,
        bookingId: eligible.booking.id,
        expiresAt: new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000),
      },
    });

    return {
      token,
      traveler: { id: eligible.traveler.id, name: eligible.traveler.name },
      bookingId: eligible.booking.id,
    };
  }

  /** Resolves a bearer token to its session, or null. Used by TravelerAuthGuard. */
  async resolveSession(token: string) {
    const session = await this.prisma.travelerSession.findUnique({
      where: { tokenHash: sha256(token) },
      include: { traveler: true },
    });
    if (!session || session.revokedAt || session.expiresAt < new Date()) return null;

    // Fire-and-forget: a failed heartbeat must never block the request.
    this.prisma.travelerSession
      .update({ where: { id: session.id }, data: { lastSeenAt: new Date() } })
      .catch(() => undefined);

    return session;
  }
}
