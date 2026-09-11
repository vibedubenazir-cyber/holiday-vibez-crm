import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { QuotationStatus, Role } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { AddQuotationItemDto } from './dto/quotation.dto';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class QuotationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  findAll(filter: { consultantId?: string; branchId?: string }) {
    return this.prisma.quotation.findMany({
      where: {
        consultantId: filter.consultantId,
        lead: filter.branchId ? { branchId: filter.branchId } : undefined,
      },
      include: { items: true, lead: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, actor: { role: Role; id: string; branchId: string | null }) {
    const quotation = await this.prisma.quotation.findUnique({
      where: { id },
      include: { items: { include: { rateCard: true } }, lead: true },
    });
    if (!quotation) throw new NotFoundException('Quotation not found');
    this.assertActorScope(actor, quotation.consultantId, quotation.lead.branchId);
    return quotation;
  }

  async create(leadId: string, actor: { role: Role; id: string; branchId: string | null }) {
    const lead = await this.prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead) throw new NotFoundException('Lead not found');
    if (actor.role === Role.TRAVEL_CONSULTANT && lead.assignedConsultantId !== actor.id) {
      throw new ForbiddenException('You can only create quotations for leads assigned to you');
    }

    const refNo = `HV-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;
    return this.prisma.quotation.create({
      data: { refNo, leadId, consultantId: actor.id, status: QuotationStatus.DRAFT },
    });
  }

  // Multi-select, auto-costing item add (spec Section 5/6 step 4). The rate is
  // snapshotted at selection time so later Admin rate edits never retroactively
  // change an existing quotation's total (spec Section 4, QuotationItem.snapshot_amount).
  async addItem(quotationId: string, dto: AddQuotationItemDto, actor: { role: Role; id: string; branchId: string | null }) {
    await this.ensureDraft(quotationId, actor);
    const rateCard = await this.prisma.rateCard.findUnique({ where: { id: dto.rateCardId } });
    if (!rateCard || !rateCard.active) throw new NotFoundException('Rate card not found or inactive');

    const quantity = dto.quantity ?? 1;
    let unitAmount = Number(rateCard.baseCost) * (1 + Number(rateCard.taxPct) / 100);

    // Quotation.currency is always INR (recalculateTotal() just sums
    // snapshotAmount with no per-item currency, and the customer-facing quote
    // displays the total labeled "INR"). A rate card priced in another
    // currency was being summed and shown as INR unconverted — convert at
    // item-add time using the same CurrencyRate table the Currency Exchange
    // page manages, so what's snapshotted is what quotation.currency claims it is.
    if (rateCard.currency !== 'INR') {
      const fx = await this.prisma.currencyRate.findUnique({ where: { code: rateCard.currency } });
      if (!fx) {
        throw new BadRequestException(
          `No INR exchange rate configured for ${rateCard.currency} — add one on the Currency Exchange page before quoting this rate card`,
        );
      }
      unitAmount *= Number(fx.rateToInr);
    }
    const snapshotAmount = Math.round(unitAmount * 100) / 100;

    await this.prisma.quotationItem.create({
      data: {
        quotationId,
        rateCardId: rateCard.id,
        description: `${rateCard.name} (${rateCard.destination})`,
        snapshotAmount,
        quantity,
      },
    });

    return this.recalculateTotal(quotationId);
  }

  async removeItem(quotationId: string, itemId: string, actor: { role: Role; id: string; branchId: string | null }) {
    await this.ensureDraft(quotationId, actor);
    const { count } = await this.prisma.quotationItem.deleteMany({ where: { id: itemId, quotationId } });
    if (count === 0) throw new NotFoundException('Item not found on this quotation');
    return this.recalculateTotal(quotationId);
  }

  async submitForApproval(id: string, actor: { role: Role; id: string; branchId: string | null }) {
    const quotation = await this.ensureDraft(id, actor);
    const items = await this.prisma.quotationItem.findMany({ where: { quotationId: id } });
    if (items.length === 0) {
      throw new BadRequestException('Add at least one item before submitting for approval');
    }

    const updated = await this.prisma.quotation.update({
      where: { id },
      data: { status: QuotationStatus.PENDING_APPROVAL },
    });

    const lead = await this.prisma.lead.findUnique({ where: { id: quotation.leadId } });
    const branch = lead ? await this.prisma.branch.findUnique({ where: { id: lead.branchId } }) : null;
    if (branch?.managerId) {
      await this.notifications.send({
        channel: 'PUSH',
        triggerType: 'quotation_pending_approval',
        recipient: branch.managerId,
        relatedEntity: `quotation:${id}`,
        subject: 'Quotation needs approval',
        body: `${quotation.refNo} is waiting on your approval`,
      });
    }
    return updated;
  }

  // Branch Manager hard gate — no quotation reaches a customer unapproved (spec
  // Section 5 step 6, closes the gap flagged in Section 1.3). Approve auto-sends.
  async approve(id: string, approverId: string, approverRole: Role, approverBranchId: string | null) {
    const quotation = await this.prisma.quotation.findUnique({ where: { id }, include: { lead: true } });
    if (!quotation) throw new NotFoundException('Quotation not found');
    if (quotation.status !== QuotationStatus.PENDING_APPROVAL) {
      throw new BadRequestException('Only quotations pending approval can be approved');
    }
    this.assertBranchScope(approverRole, approverBranchId, quotation.lead.branchId);

    const updated = await this.prisma.quotation.update({
      where: { id },
      data: {
        status: QuotationStatus.SENT,
        approvedById: approverId,
        approvedAt: new Date(),
      },
    });

    await this.notifyCustomer(quotation);

    return updated;
  }

  // Shared by approve() (auto-send once) and sendToClient() (staff-triggered
  // resend, e.g. if the customer lost the message) — kept as one path so the
  // two never drift on what "notify the customer" actually sends.
  private async notifyCustomer(quotation: { id: string; refNo: string; currency: string; totalAmount: unknown; lead: { clientName: string; phone: string; email: string | null; destination: string } }) {
    // Real, branded, viewable/printable quotation — no auth needed since the
    // customer has no account (see publicView() below) — replaces the old
    // "PDF not yet generated" placeholder link.
    const viewUrl = `${process.env.WEB_ORIGIN}/quote/${quotation.id}`;
    const amount = `${quotation.currency} ${Number(quotation.totalAmount).toLocaleString('en-IN')}`;

    await this.notifications.send({
      channel: 'WHATSAPP',
      triggerType: 'quotation_sent',
      recipient: quotation.lead.phone,
      relatedEntity: `quotation:${quotation.id}`,
      body: `Hi ${quotation.lead.clientName}, your quotation ${quotation.refNo} for ${quotation.lead.destination} (${amount}) has been sent. View it here: ${viewUrl}`,
    });
    await this.notifications.send({
      channel: 'EMAIL',
      triggerType: 'quotation_sent',
      recipient: quotation.lead.email ?? quotation.lead.phone,
      relatedEntity: `quotation:${quotation.id}`,
      subject: `Your quotation ${quotation.refNo} for ${quotation.lead.destination}`,
      body: `Hi ${quotation.lead.clientName},\n\nYour quotation ${quotation.refNo} for ${quotation.lead.destination} (${amount}) has been sent.\n\nView your quotation: ${viewUrl}\n\nYour travel consultant will follow up shortly.\n\nThank you for choosing Holiday Vibez.`,
    });
  }

  // Staff-triggered resend from the quotation detail page — approve() already
  // sends once automatically, this lets staff re-send the same WhatsApp/email
  // on demand (e.g. customer says they never got it) without re-approving.
  async sendToClient(id: string, actor: { role: Role; id: string; branchId: string | null }) {
    const quotation = await this.prisma.quotation.findUnique({ where: { id }, include: { lead: true } });
    if (!quotation) throw new NotFoundException('Quotation not found');
    if (quotation.status !== QuotationStatus.SENT) {
      throw new BadRequestException('Only sent quotations can be sent to the client');
    }
    this.assertActorScope(actor, quotation.consultantId, quotation.lead.branchId);
    await this.notifyCustomer(quotation);
    return { sent: true };
  }

  async reject(id: string, approverRole: Role, approverBranchId: string | null, comments?: string) {
    const quotation = await this.prisma.quotation.findUnique({ where: { id }, include: { lead: true } });
    if (!quotation) throw new NotFoundException('Quotation not found');
    if (quotation.status !== QuotationStatus.PENDING_APPROVAL) {
      throw new BadRequestException('Only quotations pending approval can be rejected');
    }
    this.assertBranchScope(approverRole, approverBranchId, quotation.lead.branchId);

    const updated = await this.prisma.quotation.update({ where: { id }, data: { status: QuotationStatus.REJECTED } });

    await this.notifications.send({
      channel: 'PUSH',
      triggerType: 'quotation_rejected',
      recipient: quotation.consultantId,
      relatedEntity: `quotation:${id}${comments ? `:${comments}` : ''}`,
      subject: 'Quotation rejected',
      body: `${quotation.refNo} was rejected${comments ? `: ${comments}` : ''}`,
    });
    return updated;
  }

  // Real branded, viewable/printable quotation (spec Section 15.4) — a web page
  // instead of a server-rendered PDF file; the browser's own "Print to PDF"
  // covers the PDF-export need without a headless-Chrome/PDF-library dependency.
  // Only exposes SENT quotations (approved, customer-facing) — DRAFT/
  // PENDING_APPROVAL/REJECTED aren't meant for the customer to see, even via a
  // guessable-if-leaked link.
  async pdfUrl(id: string, actor: { role: Role; id: string; branchId: string | null }) {
    const quotation = await this.ensureExists(id, actor);
    return { pdfUrl: `${process.env.WEB_ORIGIN}/quote/${id}`, refNo: quotation.refNo };
  }

  // Called by the unauthenticated public controller — no actor, so this must
  // never return anything beyond what a customer holding this exact link
  // should see (their own quotation's items/total, not internal cost data).
  async publicView(id: string) {
    const quotation = await this.prisma.quotation.findUnique({
      where: { id },
      include: { items: { orderBy: { id: 'asc' } }, lead: true },
    });
    if (!quotation || quotation.status !== QuotationStatus.SENT) {
      throw new NotFoundException('Quotation not found');
    }

    const settingKeys = ['company_name', 'company_address', 'gst_number', 'contact_email', 'contact_phone', 'company_logo_url'];
    const settings = await this.prisma.siteSetting.findMany({ where: { key: { in: settingKeys } } });
    const settingsMap = Object.fromEntries(settings.map((s) => [s.key, s.value]));

    return {
      refNo: quotation.refNo,
      createdAt: quotation.createdAt,
      currency: quotation.currency,
      totalAmount: Number(quotation.totalAmount),
      client: {
        name: quotation.lead.clientName,
        phone: quotation.lead.phone,
        email: quotation.lead.email,
        destination: quotation.lead.destination,
      },
      items: quotation.items.map((item) => ({
        description: item.description,
        quantity: item.quantity,
        unitAmount: Number(item.snapshotAmount),
        lineTotal: Number(item.snapshotAmount) * item.quantity,
      })),
      company: {
        name: settingsMap.company_name ?? 'Holiday Vibez',
        address: settingsMap.company_address ?? '',
        gstNumber: settingsMap.gst_number ?? '',
        email: settingsMap.contact_email ?? '',
        phone: settingsMap.contact_phone ?? '',
        logoUrl: settingsMap.company_logo_url || null,
      },
    };
  }

  private async recalculateTotal(quotationId: string) {
    const items = await this.prisma.quotationItem.findMany({ where: { quotationId } });
    const total = items.reduce((sum, item) => sum + Number(item.snapshotAmount) * item.quantity, 0);
    return this.prisma.quotation.update({
      where: { id: quotationId },
      data: { totalAmount: Math.round(total * 100) / 100 },
      include: { items: { include: { rateCard: true } } },
    });
  }

  private assertBranchScope(role: Role, approverBranchId: string | null, leadBranchId: string) {
    if (role === Role.BRANCH_MANAGER && approverBranchId !== leadBranchId) {
      throw new ForbiddenException("You can only approve quotations for your own branch's leads");
    }
  }

  // Consultants may only touch their own quotations; branch managers only
  // their own branch's; Admin/Director are unrestricted. Mirrors
  // assertBranchScope but also covers the consultant-ownership case, which
  // approve()/reject() don't need since only managers/admins call those.
  private assertActorScope(actor: { role: Role; id: string; branchId: string | null }, consultantId: string, leadBranchId: string) {
    if (actor.role === Role.TRAVEL_CONSULTANT && actor.id !== consultantId) {
      throw new ForbiddenException('You can only act on your own quotations');
    }
    if (actor.role === Role.BRANCH_MANAGER && actor.branchId !== leadBranchId) {
      throw new ForbiddenException("You can only act on your own branch's quotations");
    }
  }

  private async ensureDraft(id: string, actor: { role: Role; id: string; branchId: string | null }) {
    const quotation = await this.prisma.quotation.findUnique({ where: { id }, include: { lead: true } });
    if (!quotation) throw new NotFoundException('Quotation not found');
    if (quotation.status !== QuotationStatus.DRAFT) {
      throw new BadRequestException('Only draft quotations can be edited');
    }
    this.assertActorScope(actor, quotation.consultantId, quotation.lead.branchId);
    return quotation;
  }

  private async ensureExists(id: string, actor: { role: Role; id: string; branchId: string | null }) {
    const quotation = await this.prisma.quotation.findUnique({ where: { id }, include: { lead: true } });
    if (!quotation) throw new NotFoundException('Quotation not found');
    this.assertActorScope(actor, quotation.consultantId, quotation.lead.branchId);
    return quotation;
  }

  // Permanently removes a test/junk quotation. Refuses if it has a Booking
  // (unique, so at most one) — that means real payment/voucher/invoice work
  // may sit underneath, and force-deleting would either fail on the DB
  // constraint or destroy real records. The old per-quotation Itinerary
  // builder (distinct from the standalone ItineraryPlan module) cascades
  // its own days/events automatically, so deleting it is enough.
  async deleteQuotation(id: string) {
    const quotation = await this.prisma.quotation.findUnique({ where: { id } });
    if (!quotation) throw new NotFoundException('Quotation not found');

    const booking = await this.prisma.booking.findUnique({ where: { quotationId: id } });
    if (booking) {
      throw new BadRequestException('Cannot delete — this quotation has a booking. Cancel/remove the booking first.');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.itinerary.deleteMany({ where: { quotationId: id } });
      await tx.quotationItem.deleteMany({ where: { quotationId: id } });
      await tx.quotation.delete({ where: { id } });
    });

    return { success: true };
  }
}
