import { ConflictException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { LeadSource, LeadStatus, Role } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { CreateLeadDto, PublicCreateLeadDto, UpdateLeadDto } from './dto/lead.dto';
import { NotificationsService } from '../notifications/notifications.service';

export interface BulkImportRow {
  row: number;
  success: boolean;
  leadId?: string;
  error?: string;
}

type Actor = { id: string; role: Role; branchId: string | null };

const OPEN_STATUSES: LeadStatus[] = [
  LeadStatus.NEW,
  LeadStatus.PROPOSAL_SENT,
  LeadStatus.NO_CONNECT,
  LeadStatus.HOT_LEAD,
  LeadStatus.PROPOSAL_CONFIRMED,
  LeadStatus.FOLLOW_UP,
];

// Statuses a lead is considered "done" in — a new inquiry from the same phone
// number reopens it into the follow-up queue instead of sitting invisible.
// CONFIRMED is deliberately excluded: that person is an active customer, not
// a lost one, so a fresh inquiry from them shouldn't reset their pipeline stage.
const CLOSED_STATUSES: LeadStatus[] = [LeadStatus.JUNK_NOT_INTERESTED, LeadStatus.PLAN_DROPPED];

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
    const duplicate = await this.findDuplicateByPhone(dto.phone);
    if (duplicate) {
      throw new ConflictException(
        `A lead with this phone number already exists: ${duplicate.clientName} — ${duplicate.destination} (status: ${duplicate.status}, id: ${duplicate.id})`,
      );
    }

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

  // Compares by the last 10 digits so "+91-98765-43210", "9876543210", and
  // "919876543210" are all recognized as the same number regardless of how a
  // counsellor, CSV row, or ad platform formatted it. Scans in-memory rather than
  // a DB query since phone isn't stored normalized — fine at current volume; a
  // normalized-phone column + index would be the fix if the lead table grows large.
  private normalizePhone(phone: string): string {
    return phone.replace(/\D/g, '').slice(-10);
  }

  private async findDuplicateByPhone(phone: string) {
    const normalized = this.normalizePhone(phone);
    if (normalized.length < 10) return null;

    const candidates = await this.prisma.lead.findMany({
      select: { id: true, phone: true, clientName: true, destination: true, status: true },
    });
    return candidates.find((c) => this.normalizePhone(c.phone) === normalized) ?? null;
  }

  // CSV bulk import — same permission tier and create() path as a single lead (so
  // each row still auto-assigns round-robin), just looped with per-row validation
  // so one bad row doesn't sink the whole batch. Branch is matched by name
  // case-insensitively since operators upload spreadsheets, not branch UUIDs.
  async bulkImport(rows: Record<string, string>[]): Promise<BulkImportRow[]> {
    const branches = await this.prisma.branch.findMany();
    const branchByName = new Map(branches.map((b) => [b.name.toLowerCase(), b.id]));
    const validSources = new Set(Object.values(LeadSource));

    const results: BulkImportRow[] = [];
    for (let i = 0; i < rows.length; i++) {
      const rowNum = i + 2; // +1 for 0-index, +1 for the header row
      const row = rows[i];
      try {
        const source = (row.source ?? '').trim().toUpperCase();
        const clientName = (row.clientName ?? '').trim();
        const phone = (row.phone ?? '').trim();
        const destination = (row.destination ?? '').trim();
        const branchName = (row.branch ?? '').trim();
        const email = (row.email ?? '').trim();

        if (!validSources.has(source as LeadSource)) {
          throw new Error(`Invalid source "${row.source}" — must be one of ${[...validSources].join(', ')}`);
        }
        if (!clientName) throw new Error('clientName is required');
        if (!phone) throw new Error('phone is required');
        if (!destination) throw new Error('destination is required');
        const branchId = branchByName.get(branchName.toLowerCase());
        if (!branchId) throw new Error(`Unknown branch "${row.branch}"`);

        const lead = await this.create({
          source: source as LeadSource,
          clientName,
          phone,
          destination,
          branchId,
          email: email || undefined,
        });
        results.push({ row: rowNum, success: true, leadId: lead.id });
      } catch (err) {
        results.push({ row: rowNum, success: false, error: err instanceof Error ? err.message : 'Unknown error' });
      }
    }
    return results;
  }

  // Public Lead Capture API (spec Section 10) — website forms post here with no branch
  // specified, so we round-robin the branch by current open-lead load first.
  async createPublic(dto: PublicCreateLeadDto) {
    // Unlike the staff-facing create() above, an ad platform or website form can't
    // be shown an error — it just needs a 200. So instead of rejecting, reopen the
    // existing lead into the follow-up queue (if it had gone cold) and hand it
    // back unchanged otherwise, keeping "one lead = one timeline" instead of
    // fragmenting this customer's history across two records.
    const duplicate = await this.findDuplicateByPhone(dto.phone);
    if (duplicate) {
      return this.prisma.lead.update({
        where: { id: duplicate.id },
        data: CLOSED_STATUSES.includes(duplicate.status) ? { status: LeadStatus.NEW } : {},
      });
    }

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
      subject: 'New lead assigned',
      body: `${lead.clientName} — ${lead.destination}`,
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

  async update(id: string, dto: UpdateLeadDto, actor: Actor) {
    const lead = await this.ensureExists(id);
    this.assertScope(actor, lead.assignedConsultantId, lead.branchId);
    return this.prisma.lead.update({
      where: { id },
      data: {
        ...dto,
        firstContactedAt: lead.firstContactedAt ?? (dto.status && dto.status !== LeadStatus.NEW ? new Date() : undefined),
      },
    });
  }

  private assertScope(actor: Actor, consultantId: string | null, leadBranchId: string) {
    if (actor.role === Role.TRAVEL_CONSULTANT && actor.id !== consultantId) {
      throw new ForbiddenException('You can only modify your own leads');
    }
    if (actor.role === Role.BRANCH_MANAGER && actor.branchId !== leadBranchId) {
      throw new ForbiddenException("You can only modify your own branch's leads");
    }
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
          subject: 'SLA breach',
          body: `${lead.clientName}'s lead hasn't been contacted within the SLA window`,
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
