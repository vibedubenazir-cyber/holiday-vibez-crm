import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Role, TravelerDocumentType } from '@prisma/client';
import { randomUUID } from 'crypto';
import { extname } from 'path';
import { PrismaService } from '../prisma.service';
import { getPrivate, putPrivate, removePrivate } from '../storage/private-storage.util';

type StaffActor = { id: string; role: Role; branchId: string | null };
type TravelerSession = { travelerId: string; bookingId: string };

const ALLOWED_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp', '.pdf'];
export const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024;

/**
 * Travel documents — passports, visas, tickets, vouchers.
 *
 * Two rules run through everything here:
 *
 *  1. A file is never addressable. Rows store a storage key, not a URL, and the
 *     bytes only leave through a handler that has already checked the caller.
 *  2. A personal document belongs to one traveller. On a group tour, thirty
 *     people share a booking — every one of them must see the shared vouchers
 *     and none of them may see another family's passports. That is the
 *     travelerId column: null means shared with the booking, set means private
 *     to that person.
 */
@Injectable()
export class TravelerDocumentsService {
  constructor(private readonly prisma: PrismaService) {}

  /** What this traveller is allowed to see: their own, plus booking-wide. */
  async listForTraveller(session: TravelerSession) {
    const rows = await this.prisma.travelerDocument.findMany({
      where: {
        bookingId: session.bookingId,
        OR: [{ travelerId: session.travelerId }, { travelerId: null }],
      },
      orderBy: { createdAt: 'desc' },
      include: { traveler: { select: { name: true } } },
    });
    return rows.map((row) => this.toDto(row));
  }

  async listForStaff(bookingId: string, actor: StaffActor) {
    await this.assertStaffScope(bookingId, actor);
    const rows = await this.prisma.travelerDocument.findMany({
      where: { bookingId },
      orderBy: { createdAt: 'desc' },
      include: { traveler: { select: { name: true } } },
    });
    return rows.map((row) => this.toDto(row));
  }

  /**
   * A traveller uploading their own document. travelerId is taken from the
   * session, never from the request — otherwise anyone on the booking could
   * file a document against somebody else.
   */
  async uploadAsTraveller(
    session: TravelerSession,
    file: Express.Multer.File,
    type: TravelerDocumentType,
    label: string,
  ) {
    const storageKey = await this.store(file);
    const row = await this.prisma.travelerDocument.create({
      data: {
        bookingId: session.bookingId,
        travelerId: session.travelerId,
        type,
        label,
        storageKey,
        mimeType: file.mimetype,
        sizeBytes: file.size,
      },
      include: { traveler: { select: { name: true } } },
    });
    return this.toDto(row);
  }

  async uploadAsStaff(
    bookingId: string,
    actor: StaffActor,
    file: Express.Multer.File,
    type: TravelerDocumentType,
    label: string,
    travelerId?: string,
  ) {
    const booking = await this.assertStaffScope(bookingId, actor);
    if (travelerId) {
      const belongs = booking.quotation.lead.travelers.some((t) => t.id === travelerId);
      if (!belongs) throw new BadRequestException('That traveller is not on this booking');
    }

    const storageKey = await this.store(file);
    const row = await this.prisma.travelerDocument.create({
      data: {
        bookingId,
        travelerId: travelerId ?? null,
        type,
        label,
        storageKey,
        mimeType: file.mimetype,
        sizeBytes: file.size,
        uploadedById: actor.id,
      },
      include: { traveler: { select: { name: true } } },
    });
    return this.toDto(row);
  }

  /** Bytes for a traveller — same visibility rule as the list. */
  async readForTraveller(id: string, session: TravelerSession) {
    const row = await this.prisma.travelerDocument.findUnique({ where: { id } });
    if (!row || row.bookingId !== session.bookingId) throw new NotFoundException('Document not found');
    if (row.travelerId && row.travelerId !== session.travelerId) {
      // Deliberately a 404, not a 403: confirming a document exists but isn't
      // yours still tells you something about another traveller.
      throw new NotFoundException('Document not found');
    }
    return { row, buffer: await getPrivate(row.storageKey) };
  }

  async readForStaff(id: string, actor: StaffActor) {
    const row = await this.prisma.travelerDocument.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('Document not found');
    await this.assertStaffScope(row.bookingId, actor);
    return { row, buffer: await getPrivate(row.storageKey) };
  }

  /** A traveller may delete only what they uploaded themselves. */
  async removeAsTraveller(id: string, session: TravelerSession) {
    const row = await this.prisma.travelerDocument.findUnique({ where: { id } });
    if (!row || row.bookingId !== session.bookingId || row.travelerId !== session.travelerId) {
      throw new NotFoundException('Document not found');
    }
    if (row.uploadedById) {
      throw new ForbiddenException('This was added by Holiday Vibez — contact your consultant to remove it');
    }
    await this.prisma.travelerDocument.delete({ where: { id } });
    await removePrivate(row.storageKey);
    return { ok: true };
  }

  async removeAsStaff(id: string, actor: StaffActor) {
    const row = await this.prisma.travelerDocument.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('Document not found');
    await this.assertStaffScope(row.bookingId, actor);
    await this.prisma.travelerDocument.delete({ where: { id } });
    await removePrivate(row.storageKey);
    return { ok: true };
  }

  private async store(file: Express.Multer.File): Promise<string> {
    if (!file) throw new BadRequestException('No file uploaded');
    const ext = extname(file.originalname).toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      throw new BadRequestException(`Unsupported file type: ${ext || 'unknown'}`);
    }
    const key = `${randomUUID()}${ext}`;
    await putPrivate(file.buffer, key, file.mimetype);
    return key;
  }

  /** Never leaks storageKey — the client has no use for it and no way in. */
  private toDto(row: {
    id: string;
    type: TravelerDocumentType;
    label: string;
    mimeType: string;
    sizeBytes: number;
    travelerId: string | null;
    uploadedById: string | null;
    createdAt: Date;
    traveler?: { name: string } | null;
  }) {
    return {
      id: row.id,
      type: row.type,
      label: row.label,
      mimeType: row.mimeType,
      sizeBytes: row.sizeBytes,
      ownerName: row.traveler?.name ?? null,
      sharedWithBooking: row.travelerId === null,
      addedByStaff: row.uploadedById !== null,
      createdAt: row.createdAt,
    };
  }

  private async assertStaffScope(bookingId: string, actor: StaffActor) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { quotation: { include: { lead: { include: { travelers: true } } } } },
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
