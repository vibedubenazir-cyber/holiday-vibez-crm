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

  async findOne(id: string) {
    const quotation = await this.prisma.quotation.findUnique({
      where: { id },
      include: { items: { include: { rateCard: true } }, lead: true },
    });
    if (!quotation) throw new NotFoundException('Quotation not found');
    return quotation;
  }

  async create(leadId: string, consultantId: string) {
    const lead = await this.prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead) throw new NotFoundException('Lead not found');

    const refNo = `HV-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;
    return this.prisma.quotation.create({
      data: { refNo, leadId, consultantId, status: QuotationStatus.DRAFT },
    });
  }

  // Multi-select, auto-costing item add (spec Section 5/6 step 4). The rate is
  // snapshotted at selection time so later Admin rate edits never retroactively
  // change an existing quotation's total (spec Section 4, QuotationItem.snapshot_amount).
  async addItem(quotationId: string, dto: AddQuotationItemDto) {
    const quotation = await this.ensureDraft(quotationId);
    const rateCard = await this.prisma.rateCard.findUnique({ where: { id: dto.rateCardId } });
    if (!rateCard || !rateCard.active) throw new NotFoundException('Rate card not found or inactive');

    const quantity = dto.quantity ?? 1;
    const unitAmount = Number(rateCard.baseCost) * (1 + Number(rateCard.taxPct) / 100);
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

  async removeItem(quotationId: string, itemId: string) {
    await this.ensureDraft(quotationId);
    await this.prisma.quotationItem.delete({ where: { id: itemId } });
    return this.recalculateTotal(quotationId);
  }

  async submitForApproval(id: string) {
    const quotation = await this.ensureDraft(id);
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

    await this.notifications.send({
      channel: 'WHATSAPP',
      triggerType: 'quotation_sent',
      recipient: quotation.lead.phone,
      relatedEntity: `quotation:${id}`,
      body: `Hi ${quotation.lead.clientName}, your quotation ${quotation.refNo} for ${quotation.lead.destination} (${quotation.currency} ${Number(quotation.totalAmount).toLocaleString('en-IN')}) has been sent — check your email for the full itinerary.`,
    });
    await this.notifications.send({
      channel: 'EMAIL',
      triggerType: 'quotation_sent',
      recipient: quotation.lead.email ?? quotation.lead.phone,
      relatedEntity: `quotation:${id}`,
      subject: `Your quotation ${quotation.refNo} for ${quotation.lead.destination}`,
      body: `Hi ${quotation.lead.clientName},\n\nYour quotation ${quotation.refNo} for ${quotation.lead.destination} (${quotation.currency} ${Number(quotation.totalAmount).toLocaleString('en-IN')}) has been sent. Your travel consultant will follow up with the full itinerary shortly.\n\nThank you for choosing Holiday Vibez.`,
    });

    return updated;
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
    });
    return updated;
  }

  // Placeholder document generation — real branded-PDF rendering (spec Section 15.4)
  // is a template-design task, not wired up here. Returns a stable reference instead.
  async pdfUrl(id: string) {
    const quotation = await this.ensureExists(id);
    return { pdfUrl: quotation.pdfUrl ?? `/quotations/${id}/pdf-not-yet-generated`, refNo: quotation.refNo };
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

  private async ensureDraft(id: string) {
    const quotation = await this.prisma.quotation.findUnique({ where: { id } });
    if (!quotation) throw new NotFoundException('Quotation not found');
    if (quotation.status !== QuotationStatus.DRAFT) {
      throw new BadRequestException('Only draft quotations can be edited');
    }
    return quotation;
  }

  private async ensureExists(id: string) {
    const quotation = await this.prisma.quotation.findUnique({ where: { id } });
    if (!quotation) throw new NotFoundException('Quotation not found');
    return quotation;
  }
}
