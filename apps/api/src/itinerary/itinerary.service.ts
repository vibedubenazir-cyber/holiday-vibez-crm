import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import {
  CreateAccommodationDto,
  CreateActivityDto,
  CreateItineraryDayDto,
  CreateItineraryNoteDto,
  CreateTransportationDto,
  UpdateItineraryDayDto,
  UpsertItineraryTermsDto,
} from './dto/itinerary.dto';

type Actor = { id: string; role: Role; branchId: string | null };

const DAY_INCLUDE = {
  accommodations: true,
  activities: true,
  transportations: true,
  notes: true,
} as const;

@Injectable()
export class ItineraryService {
  constructor(private readonly prisma: PrismaService) {}

  // Same ownership model as QuotationsService: a consultant only ever reaches
  // their own quotations, a Branch Manager only their branch's — itinerary
  // content lives one level below Quotation, so it inherits that scope rather
  // than re-deriving its own.
  private async assertQuotationScope(quotationId: string, actor: Actor) {
    const quotation = await this.prisma.quotation.findUnique({ where: { id: quotationId }, include: { lead: true } });
    if (!quotation) throw new NotFoundException('Quotation not found');
    if (actor.role === Role.TRAVEL_CONSULTANT && quotation.consultantId !== actor.id) {
      throw new ForbiddenException('You can only manage the itinerary for your own quotations');
    }
    if (actor.role === Role.BRANCH_MANAGER && quotation.lead.branchId !== actor.branchId) {
      throw new ForbiddenException("You can only manage the itinerary for your own branch's quotations");
    }
    return quotation;
  }

  private async ensureItinerary(quotationId: string) {
    const existing = await this.prisma.itinerary.findUnique({ where: { quotationId } });
    if (existing) return existing;
    return this.prisma.itinerary.create({ data: { quotationId } });
  }

  async findByQuotation(quotationId: string, actor: Actor) {
    await this.assertQuotationScope(quotationId, actor);
    // Auto-create on first view (same as every write op) so callers always get
    // a real row — an unset itinerary is empty, not absent, from the client's
    // perspective.
    await this.ensureItinerary(quotationId);
    return this.prisma.itinerary.findUnique({
      where: { quotationId },
      include: { days: { include: DAY_INCLUDE, orderBy: { dayNumber: 'asc' } } },
    });
  }

  async upsertTerms(quotationId: string, dto: UpsertItineraryTermsDto, actor: Actor) {
    await this.assertQuotationScope(quotationId, actor);
    const itinerary = await this.ensureItinerary(quotationId);
    return this.prisma.itinerary.update({ where: { id: itinerary.id }, data: dto });
  }

  async addDay(quotationId: string, dto: CreateItineraryDayDto, actor: Actor) {
    await this.assertQuotationScope(quotationId, actor);
    const itinerary = await this.ensureItinerary(quotationId);
    return this.prisma.itineraryDay.create({
      data: {
        itineraryId: itinerary.id,
        dayNumber: dto.dayNumber,
        date: dto.date ? new Date(dto.date) : undefined,
        title: dto.title,
      },
      include: DAY_INCLUDE,
    });
  }

  private async ensureDay(dayId: string, quotationId: string, actor: Actor) {
    await this.assertQuotationScope(quotationId, actor);
    const day = await this.prisma.itineraryDay.findUnique({ where: { id: dayId }, include: { itinerary: true } });
    if (!day || day.itinerary.quotationId !== quotationId) throw new NotFoundException('Itinerary day not found');
    return day;
  }

  async updateDay(quotationId: string, dayId: string, dto: UpdateItineraryDayDto, actor: Actor) {
    await this.ensureDay(dayId, quotationId, actor);
    return this.prisma.itineraryDay.update({
      where: { id: dayId },
      data: { ...dto, date: dto.date ? new Date(dto.date) : undefined },
      include: DAY_INCLUDE,
    });
  }

  async removeDay(quotationId: string, dayId: string, actor: Actor) {
    await this.ensureDay(dayId, quotationId, actor);
    await this.prisma.itineraryDay.delete({ where: { id: dayId } });
    return { success: true };
  }

  async addAccommodation(quotationId: string, dayId: string, dto: CreateAccommodationDto, actor: Actor) {
    await this.ensureDay(dayId, quotationId, actor);
    return this.prisma.itineraryAccommodation.create({
      data: { ...dto, dayId, checkInDate: new Date(dto.checkInDate), checkOutDate: new Date(dto.checkOutDate) },
    });
  }

  async removeAccommodation(quotationId: string, dayId: string, id: string, actor: Actor) {
    await this.ensureDay(dayId, quotationId, actor);
    await this.prisma.itineraryAccommodation.delete({ where: { id } });
    return { success: true };
  }

  async addActivity(quotationId: string, dayId: string, dto: CreateActivityDto, actor: Actor) {
    await this.ensureDay(dayId, quotationId, actor);
    return this.prisma.itineraryActivity.create({ data: { ...dto, dayId } });
  }

  async removeActivity(quotationId: string, dayId: string, id: string, actor: Actor) {
    await this.ensureDay(dayId, quotationId, actor);
    await this.prisma.itineraryActivity.delete({ where: { id } });
    return { success: true };
  }

  async addTransportation(quotationId: string, dayId: string, dto: CreateTransportationDto, actor: Actor) {
    await this.ensureDay(dayId, quotationId, actor);
    return this.prisma.itineraryTransportation.create({ data: { ...dto, dayId } });
  }

  async removeTransportation(quotationId: string, dayId: string, id: string, actor: Actor) {
    await this.ensureDay(dayId, quotationId, actor);
    await this.prisma.itineraryTransportation.delete({ where: { id } });
    return { success: true };
  }

  async addNote(quotationId: string, dayId: string, dto: CreateItineraryNoteDto, actor: Actor) {
    await this.ensureDay(dayId, quotationId, actor);
    return this.prisma.itineraryNote.create({ data: { ...dto, dayId } });
  }

  async removeNote(quotationId: string, dayId: string, id: string, actor: Actor) {
    await this.ensureDay(dayId, quotationId, actor);
    await this.prisma.itineraryNote.delete({ where: { id } });
    return { success: true };
  }
}
