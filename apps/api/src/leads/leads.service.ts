import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { LeadStatus } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { CreateLeadDto, PublicCreateLeadDto, UpdateLeadDto } from './dto/lead.dto';
import { NotificationsService } from '../notifications/notifications.service';

const OPEN_STATUSES: LeadStatus[] = [
  LeadStatus.NEW,
  LeadStatus.PROPOSAL_SENT,
  LeadStatus.NO_CONNECT,
  LeadStatus.HOT_LEAD,
  LeadStatus.PROPOSAL_CONFIRMED,
  LeadStatus.FOLLOW_UP,
];

// Lead uncontacted longer than this is SLA-breached and escalated (spec Section 6, step 3).
const SLA_WINDOW_MINUTES = 30;

@Injectable()
export class LeadsService {
  private readonly logger = new Logger(LeadsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  findAll(filter: { branchId?: string; consultantId?: string }) {
    return this.prisma.lead.findMany({
      where: {
        branchId: filter.branchId,
        assignedConsultantId: filter.consultantId,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  findUnassigned() {
    return this.prisma.lead.findMany({
      where: { assignedConsultantId: null },
      orderBy: { createdAt: 'asc' },
    });
  }

  async create(dto: CreateLeadDto) {
    const lead = await this.prisma.lead.create({
      data: {
        source: dto.source,
        utmCampaign: dto.utmCampaign,
        clientName: dto.clientName,
        clientId: dto.clientId,
        phone: dto.phone,
        email: dto.email,
        destination: dto.destination,
        branchId: dto.branchId,
      },
    });
    return this.autoAssign(lead.id);
  }

  // Public Lead Capture API (spec Section 10) — website forms post here with no branch
  // specified, so we round-robin the branch by current open-lead load first.
  async createPublic(dto: PublicCreateLeadDto) {
    const branches = await this.prisma.branch.findMany();
    if (branches.length === 0) {
      throw new NotFoundException('No branches configured to receive leads');
    }

    const loads = await Promise.all(
      branches.map(async (b) => ({
        branch: b,
        openCount: await this.prisma.lead.count({
          where: { branchId: b.id, status: { in: OPEN_STATUSES } },
        }),
      })),
    );
    loads.sort((a, b) => a.openCount - b.openCount);
    const targetBranch = loads[0].branch;

    const lead = await this.prisma.lead.create({
      data: {
        source: dto.source,
        utmCampaign: dto.utmCampaign,
        clientName: dto.clientName,
        phone: dto.phone,
        email: dto.email,
        destination: dto.destination,
        branchId: targetBranch.id,
      },
    });
    return this.autoAssign(lead.id);
  }

  // Round-robin auto-assignment: picks the branch's ACTIVE (not on_leave/inactive)
  // consultant currently carrying the fewest open leads (spec Section 5/6, gap 1.3).
  async autoAssign(leadId: string) {
    const lead = await this.prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead) throw new NotFoundException('Lead not found');

    const consultants = await this.prisma.user.findMany({
      where: { branchId: lead.branchId, role: 'TRAVEL_CONSULTANT', status: 'ACTIVE' },
    });

    if (consultants.length === 0) {
      this.logger.warn(`No available consultant to assign lead ${leadId} in branch ${lead.branchId}`);
      return lead;
    }

    const loads = await Promise.all(
      consultants.map(async (c) => ({
        consultant: c,
        openCount: await this.prisma.lead.count({
          where: { assignedConsultantId: c.id, status: { in: OPEN_STATUSES } },
        }),
      })),
    );
    loads.sort((a, b) => a.openCount - b.openCount);
    const nextConsultant = loads[0].consultant;

    const updated = await this.prisma.lead.update({
      where: { id: leadId },
      data: { assignedConsultantId: nextConsultant.id },
    });

    await this.notifications.send({
      channel: 'PUSH',
      triggerType: 'lead_assigned',
      recipient: nextConsultant.id,
      relatedEntity: `lead:${leadId}`,
    });

    return updated;
  }

  async reassign(leadId: string, consultantId: string) {
    const lead = await this.ensureExists(leadId);
    const consultant = await this.prisma.user.findUnique({ where: { id: consultantId } });
    if (!consultant || consultant.branchId !== lead.branchId) {
      throw new NotFoundException('Consultant not found in this branch');
    }
    return this.prisma.lead.update({ where: { id: leadId }, data: { assignedConsultantId: consultantId } });
  }

  async update(id: string, dto: UpdateLeadDto) {
    const lead = await this.ensureExists(id);
    return this.prisma.lead.update({
      where: { id },
      data: {
        ...dto,
        firstContactedAt: lead.firstContactedAt ?? (dto.status && dto.status !== LeadStatus.NEW ? new Date() : undefined),
      },
    });
  }

  // Called periodically (see main.ts) and on-demand; flags + escalates leads not
  // contacted within the SLA window (spec Section 6 step 3, Section 12).
  async checkSlaBreaches() {
    const cutoff = new Date(Date.now() - SLA_WINDOW_MINUTES * 60 * 1000);
    const breaches = await this.prisma.lead.findMany({
      where: {
        status: LeadStatus.NEW,
        firstContactedAt: null,
        slaBreached: false,
        createdAt: { lt: cutoff },
      },
      include: { branch: true },
    });

    for (const lead of breaches) {
      await this.prisma.lead.update({ where: { id: lead.id }, data: { slaBreached: true } });
      if (lead.branch.managerId) {
        await this.notifications.send({
          channel: 'PUSH',
          triggerType: 'sla_breach_escalation',
          recipient: lead.branch.managerId,
          relatedEntity: `lead:${lead.id}`,
        });
      }
    }
    return breaches.length;
  }

  private async ensureExists(id: string) {
    const lead = await this.prisma.lead.findUnique({ where: { id } });
    if (!lead) throw new NotFoundException('Lead not found');
    return lead;
  }
}
