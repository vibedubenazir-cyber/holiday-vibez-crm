import { BadRequestException, ForbiddenException, Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { ItineraryEventType, ItineraryPlanStatus, Prisma, Role } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import {
  CreateItineraryImageDto,
  CreateItineraryPlanDayDto,
  CreateItineraryPlanDto,
  CreateItineraryPlanEventDto,
  CreatePricingOptionDto,
  GenerateItineraryDraftDto,
  UpdateItineraryImageDto,
  UpdateItineraryPlanDayDto,
  UpdateItineraryPlanDto,
  UpdateItineraryPlanEventDto,
  UpdatePricingOptionDto,
  UpsertItineraryPackageTermsDto,
} from './dto/itinerary-plan.dto';
import { generateItineraryDraft } from './itinerary-ai.util';
import { NotificationsService } from '../notifications/notifications.service';

type Actor = { id: string; role: Role; branchId: string | null };

const FULL_INCLUDE = {
  days: { include: { events: { orderBy: { sortOrder: 'asc' as const } } }, orderBy: { dayNumber: 'asc' as const } },
  pricingOptions: { include: { accommodations: true }, orderBy: { sortOrder: 'asc' as const } },
  images: { orderBy: { sortOrder: 'asc' as const } },
  packageTerms: true,
  lead: { select: { id: true, clientName: true, phone: true, email: true, destination: true, branchId: true } },
  createdBy: { select: { id: true, branchId: true } },
} as const;

type PlanWithRelations = Awaited<ReturnType<InstanceType<typeof ItinerariesService>['findFullById']>>;

// Seeded default text for a brand-new itinerary's Package Terms — the same
// four cards shown in the reference report, editable per-itinerary from there.
const DEFAULT_PACKAGE_TERMS = {
  bookingAndPayment:
    'At the time of booking, a [50]% payment is required (airfare must be paid in full). ' +
    'The remaining balance must be paid [30] days before the trip.',
  pricingAndInclusions:
    'Quoted pricing is based on the lowest available airfare and hotel rates at the time of quoting and is subject to change until confirmed. ' +
    'Any difference in cost shall be borne by the passenger. Room rates are based on standard rooms; a supplement applies for upgraded categories.',
  cancellationsAndRefunds:
    '10% cancellation charge any time after booking. 25% within [30] days before travel. 50% within [15] days before travel. ' +
    '75% within [04] days before travel. Any cancellation within [04] days will incur a 100% cancellation charge. ' +
    'Refunds are processed within 7 days and exclude any unutilized services.',
  liability:
    'Holiday Vibez acts only as a booking agent for hotels, airlines, and other service providers and is not liable for delays, cancellations, ' +
    'or losses caused by third parties beyond our control. Travel insurance is recommended.',
};

@Injectable()
export class ItinerariesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  private generateRefNo(): string {
    return String(100000 + Math.floor(Math.random() * 900000));
  }

  // refNo has no natural uniqueness source (it's a random 6-digit string), so
  // a collision is possible, if unlikely — catch the DB's unique-constraint
  // rejection and retry with a fresh number rather than letting it 500.
  private async createWithRefNoRetry<T>(fn: (refNo: string) => Promise<T>, attempt = 0): Promise<T> {
    try {
      return await fn(this.generateRefNo());
    } catch (err) {
      const isDuplicateRefNo =
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002' &&
        (err.meta?.target as string[] | undefined)?.includes('refNo');
      if (isDuplicateRefNo && attempt < 5) return this.createWithRefNoRetry(fn, attempt + 1);
      throw err;
    }
  }

  private assertScope(
    plan: { createdById: string; createdBy?: { branchId: string | null } | null; lead?: { branchId: string } | null },
    actor: Actor,
  ) {
    if (actor.role === Role.TRAVEL_CONSULTANT && plan.createdById !== actor.id) {
      throw new ForbiddenException('You can only manage your own itineraries');
    }
    if (actor.role === Role.BRANCH_MANAGER) {
      const branchId = plan.lead?.branchId ?? plan.createdBy?.branchId ?? null;
      if (branchId !== actor.branchId) {
        throw new ForbiddenException("You can only manage your own branch's itineraries");
      }
    }
  }

  private buildScopeWhere(actor: Actor) {
    if (actor.role === Role.TRAVEL_CONSULTANT) return { createdById: actor.id };
    if (actor.role === Role.BRANCH_MANAGER) {
      // `actor.branchId ?? undefined` would collapse an unset branchId to "no
      // filter" (org-wide) instead of "matches nothing" — a misconfigured
      // Branch Manager with no branchId must see zero itineraries, not all.
      const branchId = actor.branchId ?? '__none__';
      return { OR: [{ lead: { branchId } }, { leadId: null, createdBy: { branchId } }] };
    }
    return {};
  }

  private async findFullById(id: string) {
    const plan = await this.prisma.itineraryPlan.findUnique({ where: { id }, include: FULL_INCLUDE });
    if (!plan) throw new NotFoundException('Itinerary not found');
    return plan;
  }

  private buildDefaultDays(start?: string, end?: string): { dayNumber: number; date?: Date }[] {
    if (!start || !end) return [{ dayNumber: 1 }];
    const startDate = new Date(start);
    const endDate = new Date(end);
    const nights = Math.max(0, Math.round((endDate.getTime() - startDate.getTime()) / 86_400_000));
    return Array.from({ length: nights + 1 }, (_, i) => {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      return { dayNumber: i + 1, date };
    });
  }

  private computeOptionTotals(plan: PlanWithRelations, option: PlanWithRelations['pricingOptions'][number]) {
    const allEvents = plan.days.flatMap((d) => d.events);
    const sharedEvents = allEvents.filter((e) => e.type !== ItineraryEventType.ACCOMMODATION);
    const lineItems = [...option.accommodations, ...sharedEvents].map((e) => {
      const net = e.netAmount ? Number(e.netAmount) : 0;
      const markupPct = e.markupPct ? Number(e.markupPct) : 0;
      const gross = net + (net * markupPct) / 100;
      return { eventId: e.id, type: e.type, name: e.name, net, markupPct, gross };
    });
    const subtotalGross = lineItems.reduce((sum, li) => sum + li.gross, 0);
    const baseMarkupPct = Number(option.baseMarkupPct);
    const extraMarkupAmount = Number(option.extraMarkupAmount);
    const baseMarkupAmount = (subtotalGross * baseMarkupPct) / 100;
    const discountAmount = Number(option.discountAmount);
    const taxable = Math.max(0, subtotalGross + baseMarkupAmount + extraMarkupAmount - discountAmount);
    const cgstPct = Number(option.cgstPct);
    const sgstPct = Number(option.sgstPct);
    const igstPct = Number(option.igstPct);
    const tcsPct = Number(option.tcsPct);
    const cgstAmount = (taxable * cgstPct) / 100;
    const sgstAmount = (taxable * sgstPct) / 100;
    const igstAmount = (taxable * igstPct) / 100;
    const tcsAmount = (taxable * tcsPct) / 100;
    const totalIncludingGst = taxable + cgstAmount + sgstAmount + igstAmount + tcsAmount;
    return {
      optionId: option.id,
      label: option.label,
      lineItems,
      subtotalGross,
      baseMarkupPct,
      baseMarkupAmount,
      extraMarkupAmount,
      discountAmount,
      cgstPct,
      sgstPct,
      igstPct,
      tcsPct,
      cgstAmount,
      sgstAmount,
      igstAmount,
      tcsAmount,
      totalIncludingGst,
    };
  }

  private formatDuration(start: Date | null, end: Date | null) {
    if (!start || !end) return null;
    const nights = Math.max(0, Math.round((end.getTime() - start.getTime()) / 86_400_000));
    return `${nights}N/${nights + 1}D`;
  }

  private toSummary(plan: PlanWithRelations) {
    const firstOption = plan.pricingOptions[0];
    const totals = firstOption ? this.computeOptionTotals(plan, firstOption) : null;
    return {
      id: plan.id,
      refNo: plan.refNo,
      title: plan.title,
      coverPhotoUrl: plan.coverPhotoUrl,
      destinations: plan.destinations,
      startDate: plan.startDate,
      endDate: plan.endDate,
      duration: this.formatDuration(plan.startDate, plan.endDate),
      price: totals?.totalIncludingGst ?? null,
      websitePerPersonPrice: plan.websitePerPersonPrice,
      showOnWebsite: plan.showOnWebsite,
      status: plan.status,
      updatedAt: plan.updatedAt,
    };
  }

  async list(actor: Actor) {
    const plans = await this.prisma.itineraryPlan.findMany({
      where: this.buildScopeWhere(actor),
      include: FULL_INCLUDE,
      orderBy: { updatedAt: 'desc' },
    });
    return plans.map((plan) => this.toSummary(plan));
  }

  async create(dto: CreateItineraryPlanDto, actor: Actor) {
    return this.createWithRefNoRetry((refNo) => this.createPlan(refNo, dto, actor));
  }

  private async createPlan(refNo: string, dto: CreateItineraryPlanDto, actor: Actor) {
    const plan = await this.prisma.itineraryPlan.create({
      data: {
        refNo,
        title: dto.title,
        leadId: dto.leadId,
        destinations: dto.destinations ?? [],
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
        adultsCount: dto.adultsCount ?? 1,
        childrenCount: dto.childrenCount ?? 0,
        infantsCount: dto.infantsCount ?? 0,
        notes: dto.notes,
        theme: dto.theme,
        showOnWebsite: dto.showOnWebsite ?? false,
        websitePerPersonPrice: dto.websitePerPersonPrice,
        websiteValidUntil: dto.websiteValidUntil ? new Date(dto.websiteValidUntil) : undefined,
        isPopular: dto.isPopular ?? false,
        isSpecial: dto.isSpecial ?? false,
        aboutPackage: dto.aboutPackage,
        createdById: actor.id,
        days: { create: this.buildDefaultDays(dto.startDate, dto.endDate) },
        pricingOptions: { create: [{ label: 'Option 1' }] },
        packageTerms: { create: DEFAULT_PACKAGE_TERMS },
      },
      include: FULL_INCLUDE,
    });
    return plan;
  }

  async createFromAi(dto: GenerateItineraryDraftDto, actor: Actor) {
    // generateItineraryDraft throws plain Errors (missing API key, provider
    // failure, unusable JSON). Left uncaught, Nest's filter flattens them to a
    // generic 500 "Internal server error" and the consultant loses the one
    // thing that tells them what to do next — so translate to a 503 that keeps
    // the message.
    let draft: Awaited<ReturnType<typeof generateItineraryDraft>>;
    try {
      draft = await generateItineraryDraft(dto);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'AI itinerary generation failed';
      throw new ServiceUnavailableException(message);
    }
    return this.createWithRefNoRetry((refNo) => this.createPlanFromAi(refNo, dto, draft, actor));
  }

  private async createPlanFromAi(
    refNo: string,
    dto: GenerateItineraryDraftDto,
    draft: Awaited<ReturnType<typeof generateItineraryDraft>>,
    actor: Actor,
  ) {
    return this.prisma.itineraryPlan.create({
      data: {
        refNo,
        title: draft.title,
        destinations: dto.destinations,
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
        adultsCount: dto.adultsCount ?? 1,
        childrenCount: dto.childrenCount ?? 0,
        theme: dto.theme,
        notes: dto.notes,
        createdById: actor.id,
        days: {
          create: draft.days.map((day) => ({
            dayNumber: day.dayNumber,
            date: new Date(day.date),
            events: {
              create: day.events.map((event, idx) => ({
                type: event.type as ItineraryEventType,
                name: event.name,
                destination: event.destination,
                description: event.description,
                sortOrder: idx,
              })),
            },
          })),
        },
        pricingOptions: { create: [{ label: 'Option 1' }] },
        packageTerms: { create: DEFAULT_PACKAGE_TERMS },
      },
      include: FULL_INCLUDE,
    });
  }

  async duplicate(id: string, actor: Actor) {
    const original = await this.findFullById(id);
    this.assertScope(original, actor);

    return this.createWithRefNoRetry((refNo) => this.duplicateWithRefNo(original, refNo, actor));
  }

  private async duplicateWithRefNo(original: PlanWithRelations, refNo: string, actor: Actor) {
    return this.prisma.$transaction(async (tx) => {
      const created = await tx.itineraryPlan.create({
        data: {
          refNo,
          title: `${original.title} (Copy)`,
          leadId: original.leadId,
          destinations: original.destinations,
          startDate: original.startDate,
          endDate: original.endDate,
          adultsCount: original.adultsCount,
          childrenCount: original.childrenCount,
          infantsCount: original.infantsCount,
          notes: original.notes,
          coverPhotoUrl: original.coverPhotoUrl,
          theme: original.theme,
          status: ItineraryPlanStatus.DRAFT,
          showOnWebsite: false,
          isPopular: false,
          isSpecial: false,
          aboutPackage: original.aboutPackage,
          createdById: actor.id,
          days: {
            create: original.days.map((day) => ({
              dayNumber: day.dayNumber,
              date: day.date,
              events: {
                create: day.events.map((event) => ({
                  type: event.type,
                  sortOrder: event.sortOrder,
                  name: event.name,
                  destination: event.destination,
                  date: event.date,
                  endDate: event.endDate,
                  startTime: event.startTime,
                  endTime: event.endTime,
                  showTime: event.showTime,
                  description: event.description,
                  photoUrl: event.photoUrl,
                  transferType: event.transferType,
                  netAmount: event.netAmount ?? undefined,
                  markupPct: event.markupPct ?? undefined,
                  addOns: event.addOns ?? undefined,
                  details: event.details ?? undefined,
                })),
              },
            })),
          },
          images: { create: original.images.map((img) => ({ url: img.url, caption: img.caption, sortOrder: img.sortOrder })) },
          packageTerms: original.packageTerms
            ? {
                create: {
                  bookingAndPayment: original.packageTerms.bookingAndPayment,
                  pricingAndInclusions: original.packageTerms.pricingAndInclusions,
                  cancellationsAndRefunds: original.packageTerms.cancellationsAndRefunds,
                  liability: original.packageTerms.liability,
                },
              }
            : undefined,
        },
        include: { days: { include: { events: true }, orderBy: { dayNumber: 'asc' } } },
      });

      // Zip original/created days+events (created in the same order) to map
      // old accommodation-event ids to their freshly minted clones, so pricing
      // options can re-attach to the right accommodation in the copy.
      const idMap = new Map<string, string>();
      original.days.forEach((origDay, dayIdx) => {
        const newDay = created.days[dayIdx];
        origDay.events.forEach((origEvent, eventIdx) => {
          const newEvent = newDay?.events[eventIdx];
          if (newEvent) idMap.set(origEvent.id, newEvent.id);
        });
      });

      for (const option of original.pricingOptions) {
        await tx.itineraryPricingOption.create({
          data: {
            itineraryPlanId: created.id,
            label: option.label,
            sortOrder: option.sortOrder,
            baseMarkupPct: option.baseMarkupPct,
            extraMarkupAmount: option.extraMarkupAmount,
            cgstPct: option.cgstPct,
            sgstPct: option.sgstPct,
            igstPct: option.igstPct,
            tcsPct: option.tcsPct,
            discountAmount: option.discountAmount,
            accommodations: {
              connect: option.accommodations
                .map((acc) => idMap.get(acc.id))
                .filter((v): v is string => Boolean(v))
                .map((eid) => ({ id: eid })),
            },
          },
        });
      }

      return created.id;
    }).then((newId) => this.findOne(newId, actor));
  }

  async findOne(id: string, actor: Actor) {
    const plan = await this.findFullById(id);
    this.assertScope(plan, actor);
    return plan;
  }

  async update(id: string, dto: UpdateItineraryPlanDto, actor: Actor) {
    const plan = await this.findFullById(id);
    this.assertScope(plan, actor);
    return this.prisma.itineraryPlan.update({
      where: { id },
      data: {
        ...dto,
        startDate: dto.startDate !== undefined ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate !== undefined ? new Date(dto.endDate) : undefined,
        websiteValidUntil: dto.websiteValidUntil !== undefined ? new Date(dto.websiteValidUntil) : undefined,
      },
      include: FULL_INCLUDE,
    });
  }

  async publish(id: string, actor: Actor) {
    const plan = await this.findFullById(id);
    this.assertScope(plan, actor);
    await this.prisma.itineraryPlan.update({ where: { id }, data: { status: ItineraryPlanStatus.READY_TO_SHARE } });
    return { url: `${process.env.WEB_ORIGIN}/itinerary/${id}/final` };
  }

  // One-click WhatsApp + email to the linked lead, mirroring
  // QuotationsService.notifyCustomer so the two client-facing sends never
  // drift in tone or mechanics. Auto-publishes a draft first — the message
  // carries the public link, which 404s for anything not READY_TO_SHARE.
  async sendToClient(id: string, actor: Actor) {
    const plan = await this.findFullById(id);
    this.assertScope(plan, actor);
    if (!plan.lead) {
      throw new BadRequestException('Link a lead to this itinerary first — the client contact details come from the lead.');
    }
    if (plan.status === ItineraryPlanStatus.ARCHIVED) {
      throw new BadRequestException('Archived itineraries cannot be sent to a client');
    }
    if (plan.status !== ItineraryPlanStatus.READY_TO_SHARE) {
      await this.prisma.itineraryPlan.update({ where: { id }, data: { status: ItineraryPlanStatus.READY_TO_SHARE } });
    }

    const viewUrl = `${process.env.WEB_ORIGIN}/itinerary/${id}/final`;
    const destination = plan.destinations.join(', ') || plan.lead.destination;

    await this.notifications.send({
      channel: 'WHATSAPP',
      triggerType: 'itinerary_sent',
      recipient: plan.lead.phone,
      relatedEntity: `itinerary:${id}`,
      body: `Hi ${plan.lead.clientName}, your itinerary ${plan.refNo} for ${destination} is ready. View it here: ${viewUrl}`,
    });
    await this.notifications.send({
      channel: 'EMAIL',
      triggerType: 'itinerary_sent',
      recipient: plan.lead.email ?? plan.lead.phone,
      relatedEntity: `itinerary:${id}`,
      subject: `Your itinerary ${plan.refNo} for ${destination}`,
      body: `Hi ${plan.lead.clientName},\n\nYour itinerary ${plan.refNo} for ${destination} is ready.\n\nView your itinerary: ${viewUrl}\n\nYour travel consultant will follow up shortly.\n\nThank you for choosing Holiday Vibez.`,
    });

    return { sent: true, url: viewUrl };
  }

  // --- Days -----------------------------------------------------------

  async addDay(planId: string, dto: CreateItineraryPlanDayDto, actor: Actor) {
    const plan = await this.findFullById(planId);
    this.assertScope(plan, actor);
    return this.prisma.itineraryPlanDay.create({
      data: { itineraryPlanId: planId, dayNumber: dto.dayNumber, date: dto.date ? new Date(dto.date) : undefined },
      include: { events: true },
    });
  }

  private async ensureDay(planId: string, dayId: string, actor: Actor) {
    const plan = await this.findFullById(planId);
    this.assertScope(plan, actor);
    const day = plan.days.find((d) => d.id === dayId);
    if (!day) throw new NotFoundException('Day not found');
    return day;
  }

  async updateDay(planId: string, dayId: string, dto: UpdateItineraryPlanDayDto, actor: Actor) {
    await this.ensureDay(planId, dayId, actor);
    return this.prisma.itineraryPlanDay.update({
      where: { id: dayId },
      data: { ...dto, date: dto.date !== undefined ? new Date(dto.date) : undefined },
      include: { events: true },
    });
  }

  async removeDay(planId: string, dayId: string, actor: Actor) {
    await this.ensureDay(planId, dayId, actor);
    await this.prisma.itineraryPlanDay.delete({ where: { id: dayId } });
    return { success: true };
  }

  // --- Events -----------------------------------------------------------

  async addEvent(planId: string, dayId: string, dto: CreateItineraryPlanEventDto, actor: Actor) {
    await this.ensureDay(planId, dayId, actor);
    return this.prisma.itineraryPlanEvent.create({
      data: {
        dayId,
        type: dto.type,
        name: dto.name,
        destination: dto.destination,
        date: dto.date ? new Date(dto.date) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
        startTime: dto.startTime,
        endTime: dto.endTime,
        showTime: dto.showTime ?? true,
        description: dto.description,
        photoUrl: dto.photoUrl,
        transferType: dto.transferType,
        netAmount: dto.netAmount,
        markupPct: dto.markupPct,
        addOns: (dto.addOns as unknown as Prisma.InputJsonValue) ?? undefined,
        details: (dto.details as Prisma.InputJsonValue) ?? undefined,
        sortOrder: dto.sortOrder ?? 0,
      },
    });
  }

  private async ensureEvent(planId: string, dayId: string, eventId: string, actor: Actor) {
    const day = await this.ensureDay(planId, dayId, actor);
    const event = day.events.find((e) => e.id === eventId);
    if (!event) throw new NotFoundException('Event not found');
    return event;
  }

  async updateEvent(planId: string, dayId: string, eventId: string, dto: UpdateItineraryPlanEventDto, actor: Actor) {
    await this.ensureEvent(planId, dayId, eventId, actor);
    return this.prisma.itineraryPlanEvent.update({
      where: { id: eventId },
      data: {
        ...dto,
        date: dto.date !== undefined ? new Date(dto.date) : undefined,
        endDate: dto.endDate !== undefined ? new Date(dto.endDate) : undefined,
        addOns: (dto.addOns as unknown as Prisma.InputJsonValue) ?? undefined,
        details: (dto.details as Prisma.InputJsonValue) ?? undefined,
      },
    });
  }

  async removeEvent(planId: string, dayId: string, eventId: string, actor: Actor) {
    await this.ensureEvent(planId, dayId, eventId, actor);
    await this.prisma.itineraryPlanEvent.delete({ where: { id: eventId } });
    return { success: true };
  }

  // --- Package terms ------------------------------------------------------

  async upsertPackageTerms(planId: string, dto: UpsertItineraryPackageTermsDto, actor: Actor) {
    const plan = await this.findFullById(planId);
    this.assertScope(plan, actor);
    return this.prisma.itineraryPackageTerms.upsert({
      where: { itineraryPlanId: planId },
      create: { itineraryPlanId: planId, ...dto },
      update: dto,
    });
  }

  // --- Images -------------------------------------------------------------

  async addImage(planId: string, dto: CreateItineraryImageDto, actor: Actor) {
    const plan = await this.findFullById(planId);
    this.assertScope(plan, actor);
    return this.prisma.itineraryImage.create({ data: { itineraryPlanId: planId, ...dto } });
  }

  private async ensureImage(planId: string, imageId: string, actor: Actor) {
    const plan = await this.findFullById(planId);
    this.assertScope(plan, actor);
    const image = plan.images.find((i) => i.id === imageId);
    if (!image) throw new NotFoundException('Image not found');
    return image;
  }

  async updateImage(planId: string, imageId: string, dto: UpdateItineraryImageDto, actor: Actor) {
    await this.ensureImage(planId, imageId, actor);
    return this.prisma.itineraryImage.update({ where: { id: imageId }, data: dto });
  }

  async removeImage(planId: string, imageId: string, actor: Actor) {
    await this.ensureImage(planId, imageId, actor);
    await this.prisma.itineraryImage.delete({ where: { id: imageId } });
    return { success: true };
  }

  // --- Pricing options ------------------------------------------------------

  async addPricingOption(planId: string, dto: CreatePricingOptionDto, actor: Actor) {
    const plan = await this.findFullById(planId);
    this.assertScope(plan, actor);
    return this.prisma.itineraryPricingOption.create({
      data: {
        itineraryPlanId: planId,
        label: dto.label ?? `Option ${plan.pricingOptions.length + 1}`,
        sortOrder: dto.sortOrder ?? plan.pricingOptions.length,
      },
      include: { accommodations: true },
    });
  }

  async updatePricingOption(planId: string, optionId: string, dto: UpdatePricingOptionDto, actor: Actor) {
    const plan = await this.findFullById(planId);
    this.assertScope(plan, actor);
    const option = plan.pricingOptions.find((o) => o.id === optionId);
    if (!option) throw new NotFoundException('Pricing option not found');

    let accommodations: { set: { id: string }[] } | undefined;
    if (dto.accommodationEventIds) {
      const validIds = new Set(
        plan.days.flatMap((d) => d.events).filter((e) => e.type === ItineraryEventType.ACCOMMODATION).map((e) => e.id),
      );
      accommodations = { set: dto.accommodationEventIds.filter((eid) => validIds.has(eid)).map((eid) => ({ id: eid })) };
    }

    return this.prisma.itineraryPricingOption.update({
      where: { id: optionId },
      data: {
        label: dto.label,
        sortOrder: dto.sortOrder,
        baseMarkupPct: dto.baseMarkupPct,
        extraMarkupAmount: dto.extraMarkupAmount,
        cgstPct: dto.cgstPct,
        sgstPct: dto.sgstPct,
        igstPct: dto.igstPct,
        tcsPct: dto.tcsPct,
        discountAmount: dto.discountAmount,
        accommodations,
      },
      include: { accommodations: true },
    });
  }

  async removePricingOption(planId: string, optionId: string, actor: Actor) {
    const plan = await this.findFullById(planId);
    this.assertScope(plan, actor);
    const option = plan.pricingOptions.find((o) => o.id === optionId);
    if (!option) throw new NotFoundException('Pricing option not found');

    // The "at least one option remains" count-then-delete needs to happen
    // atomically — two concurrent removals on a 2-option plan could each pass
    // the count check before either delete lands, leaving zero options.
    await this.removePricingOptionGuarded(planId, optionId);
    return { success: true };
  }

  private async removePricingOptionGuarded(planId: string, optionId: string, attempt = 0): Promise<void> {
    try {
      await this.prisma.$transaction(
        async (tx) => {
          const count = await tx.itineraryPricingOption.count({ where: { itineraryPlanId: planId } });
          if (count <= 1) {
            throw new BadRequestException('An itinerary needs at least one pricing option');
          }
          await tx.itineraryPricingOption.delete({ where: { id: optionId } });
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (err) {
      const isSerializationFailure = err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2034';
      if (isSerializationFailure && attempt < 1) return this.removePricingOptionGuarded(planId, optionId, attempt + 1);
      throw err;
    }
  }

  async getPricingSummary(planId: string, actor: Actor) {
    const plan = await this.findFullById(planId);
    this.assertScope(plan, actor);
    return { refNo: plan.refNo, options: plan.pricingOptions.map((option) => this.computeOptionTotals(plan, option)) };
  }

  // --- Public report --------------------------------------------------------

  // Card-level listing for the public marketing site's Packages page. Only
  // plans a consultant explicitly flagged Show on Website AND published
  // (READY_TO_SHARE) appear — a flagged draft stays off the site until it's
  // publishable, so every card can safely link to the full public report.
  // Expired validity windows drop out automatically.
  async publicWebsitePackages() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const plans = await this.prisma.itineraryPlan.findMany({
      where: {
        showOnWebsite: true,
        status: ItineraryPlanStatus.READY_TO_SHARE,
        OR: [{ websiteValidUntil: null }, { websiteValidUntil: { gte: today } }],
      },
      include: { _count: { select: { days: true } } },
      orderBy: [{ isPopular: 'desc' }, { isSpecial: 'desc' }, { updatedAt: 'desc' }],
    });
    return plans.map((plan) => {
      const nights =
        plan.startDate && plan.endDate
          ? Math.max(0, Math.round((plan.endDate.getTime() - plan.startDate.getTime()) / 86_400_000))
          : Math.max(0, plan._count.days - 1);
      return {
        id: plan.id,
        title: plan.title,
        destinations: plan.destinations,
        nights,
        days: nights + 1,
        pricePerPerson: plan.websitePerPersonPrice,
        validUntil: plan.websiteValidUntil,
        coverPhotoUrl: plan.coverPhotoUrl,
        isPopular: plan.isPopular,
        isSpecial: plan.isSpecial,
        aboutPackage: plan.aboutPackage,
        theme: plan.theme,
      };
    });
  }

  // `details` is a freeform Json column (no DTO-enforced shape beyond
  // @IsObject) — a consultant could stash internal notes in an unexpected
  // key. The public report must only ever surface the fields the report
  // template actually knows how to render.
  private static readonly PUBLIC_DETAIL_KEYS = [
    'hotelCategory',
    'roomName',
    'mealPlan',
    'single',
    'double',
    'triple',
    'quad',
    'cwb',
    'cnb',
    'checkInTime',
    'checkOutTime',
    'flightNumber',
    'fromDestination',
    'toDestination',
    'durationMinutes',
    'mealType',
  ] as const;

  private sanitizePublicDetails(details: unknown): Record<string, unknown> | undefined {
    if (!details || typeof details !== 'object') return undefined;
    const source = details as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const key of ItinerariesService.PUBLIC_DETAIL_KEYS) {
      if (key in source) out[key] = source[key];
    }
    return Object.keys(out).length ? out : undefined;
  }

  async publicView(id: string) {
    const plan = await this.prisma.itineraryPlan.findUnique({ where: { id }, include: FULL_INCLUDE });
    if (!plan || plan.status !== ItineraryPlanStatus.READY_TO_SHARE) {
      throw new NotFoundException('Itinerary not found');
    }
    return {
      id: plan.id,
      refNo: plan.refNo,
      title: plan.title,
      destinations: plan.destinations,
      startDate: plan.startDate,
      endDate: plan.endDate,
      adultsCount: plan.adultsCount,
      childrenCount: plan.childrenCount,
      infantsCount: plan.infantsCount,
      coverPhotoUrl: plan.coverPhotoUrl,
      createdAt: plan.createdAt,
      days: plan.days.map((day) => ({
        id: day.id,
        dayNumber: day.dayNumber,
        date: day.date,
        events: day.events.map((event) => ({
          id: event.id,
          type: event.type,
          name: event.name,
          destination: event.destination,
          date: event.date,
          endDate: event.endDate,
          startTime: event.startTime,
          endTime: event.endTime,
          showTime: event.showTime,
          description: event.description,
          photoUrl: event.photoUrl,
          details: this.sanitizePublicDetails(event.details),
        })),
      })),
      images: plan.images.map((img) => ({ id: img.id, url: img.url, caption: img.caption })),
      packageTerms: plan.packageTerms,
      pricingOptions: plan.pricingOptions.map((option) => {
        const totals = this.computeOptionTotals(plan, option);
        return {
          id: option.id,
          label: option.label,
          totalIncludingGst: totals.totalIncludingGst,
          accommodations: option.accommodations.map((a) => ({
            id: a.id,
            name: a.name,
            destination: a.destination,
            date: a.date,
            endDate: a.endDate,
            photoUrl: a.photoUrl,
            description: a.description,
            details: this.sanitizePublicDetails(a.details),
          })),
        };
      }),
    };
  }
}
