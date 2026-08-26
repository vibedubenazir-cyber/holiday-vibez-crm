import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateCampaignDto } from './dto/campaign.dto';
import { UpsertOccasionDto } from './dto/occasion.dto';
import { ReengagementPreviewDto, ReengagementSendDto } from './dto/reengagement.dto';
import { interpolateTemplate } from '../common/template.util';

type Actor = { id: string; role: Role; branchId: string | null };

@Injectable()
export class MarketingService {
  private readonly logger = new Logger(MarketingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  findAllCampaigns() {
    return this.prisma.campaign.findMany({
      include: { template: true, audienceBranch: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  createCampaign(dto: CreateCampaignDto, createdBy: string) {
    return this.prisma.campaign.create({
      data: {
        name: dto.name,
        channel: dto.channel,
        templateId: dto.templateId,
        audienceBranchId: dto.audienceBranchId,
        audienceLeadStatus: dto.audienceLeadStatus,
        createdBy,
      },
    });
  }

  // Resolves the audience from Leads matching the stored filters and
  // calls the same NotificationsService every other messaging feature uses (Inbox,
  // Quotation approval, Voucher/Invoice issuance) — real for WhatsApp when
  // WHATSAPP_API_KEY is configured (see notifications.service.ts), console-log
  // otherwise. Note: WhatsApp campaigns are business-initiated and outside any
  // recent customer conversation, so Meta requires a pre-approved message
  // template for these in production — free text (what we send here) will only
  // succeed for leads within an active 24h session window.
  async sendCampaign(id: string) {
    const campaign = await this.prisma.campaign.findUnique({ where: { id }, include: { template: true } });
    if (!campaign) throw new NotFoundException('Campaign not found');
    // Idempotency: a double-click (or a resend of an already-sent campaign)
    // must not blast the whole audience twice.
    if (campaign.status === 'SENT') throw new BadRequestException('This campaign has already been sent');

    const leads = await this.prisma.lead.findMany({
      where: {
        branchId: campaign.audienceBranchId ?? undefined,
        status: campaign.audienceLeadStatus ?? undefined,
      },
    });

    for (const lead of leads) {
      const recipient = campaign.channel === 'EMAIL' ? (lead.email ?? lead.phone) : lead.phone;
      const vars = { name: lead.clientName, destination: lead.destination };
      // Per-recipient dedup key so a retried send skips leads already messaged.
      await this.notifications.send({
        channel: campaign.channel,
        triggerType: 'campaign',
        recipient,
        relatedEntity: `campaign:${id}:${lead.id}`,
        body: interpolateTemplate(campaign.template?.body, vars),
        subject: interpolateTemplate(campaign.template?.subject, vars) ?? campaign.name,
      });
    }

    return this.prisma.campaign.update({
      where: { id },
      data: { status: 'SENT', sentAt: new Date(), sentCount: leads.length },
    });
  }

  async dashboard() {
    const [leadsBySource, campaignsThisMonth, upcoming] = await Promise.all([
      this.prisma.lead.groupBy({ by: ['source'], _count: { _all: true } }),
      this.prisma.campaign.count({
        where: { status: 'SENT', sentAt: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) } },
      }),
      this.upcomingBirthdaysAndAnniversaries(),
    ]);

    return {
      leadsBySource: leadsBySource.map((r) => ({ source: r.source, count: r._count._all })),
      campaignsSentThisMonth: campaignsThisMonth,
      upcoming,
    };
  }

  private async upcomingBirthdaysAndAnniversaries() {
    const travelers = await this.prisma.traveler.findMany({
      where: { OR: [{ dateOfBirth: { not: null } }, { anniversaryDate: { not: null } }] },
      include: { lead: true },
    });

    const today = new Date();
    const inNextDays = (date: Date, days: number) => {
      const next = new Date(today.getFullYear(), date.getMonth(), date.getDate());
      if (next < today) next.setFullYear(next.getFullYear() + 1);
      const diffDays = (next.getTime() - today.getTime()) / 86400000;
      return diffDays >= 0 && diffDays <= days;
    };

    return travelers
      .filter((t) => (t.dateOfBirth && inNextDays(t.dateOfBirth, 7)) || (t.anniversaryDate && inNextDays(t.anniversaryDate, 7)))
      .map((t) => ({
        travelerId: t.id,
        name: t.name,
        leadClientName: t.lead.clientName,
        type: t.dateOfBirth && inNextDays(t.dateOfBirth, 7) ? 'BIRTHDAY' : 'ANNIVERSARY',
      }));
  }

  // In-process daily sweep (spec Section 1.1's already-working birthday/anniversary
  // automation) — see main.ts for the same interval pattern as SLA escalation.
  async checkBirthdaysAndAnniversaries() {
    const matches = await this.upcomingBirthdaysAndAnniversaries();
    const dueToday = matches; // upcoming() already scopes to "today or within window"; greeting fires same-day in practice via the 0-day match
    const todayKey = new Date().toISOString().slice(0, 10);
    for (const match of dueToday) {
      const traveler = await this.prisma.traveler.findUnique({ where: { id: match.travelerId }, include: { lead: true } });
      if (!traveler) continue;
      const isToday = (date: Date | null) => {
        if (!date) return false;
        const now = new Date();
        return date.getDate() === now.getDate() && date.getMonth() === now.getMonth();
      };
      const triggerType = isToday(traveler.dateOfBirth) ? 'birthday_greeting' : isToday(traveler.anniversaryDate) ? 'anniversary_greeting' : null;
      if (!triggerType) continue;

      // The sweep runs every few hours, so without a dedup check the same
      // greeting would go out multiple times on the actual day. The date is
      // baked into relatedEntity (rather than a static traveler:id key) so
      // next year's birthday isn't blocked by this year's send.
      const relatedEntity = `traveler:${traveler.id}:${triggerType}:${todayKey}`;
      const alreadySent = await this.prisma.notification.findFirst({ where: { relatedEntity } });
      if (alreadySent) continue;

      const firstName = traveler.name.trim().split(/\s+/)[0] || traveler.name;
      const body =
        triggerType === 'birthday_greeting'
          ? `🎉 Happy Birthday, ${firstName}! Everyone at Holiday Vibez wishes you a joyful year ahead — full of new places and happy journeys. ✈️ Whenever you're ready for your next getaway, we're just a message away.`
          : `💐 Happy Anniversary, ${firstName}! Wishing you and your loved one a lifetime of togetherness. Here's to celebrating it somewhere memorable — we'd love to help you plan the trip. ✈️`;

      await this.notifications.send({
        channel: 'WHATSAPP',
        triggerType,
        recipient: traveler.phone ?? traveler.lead.phone,
        relatedEntity,
        body,
      });
      this.logger.log(`Sent ${triggerType} to ${traveler.name}`);
    }
  }

  // ---- Festive / occasion greetings (auto) ----

  listOccasions() {
    return this.prisma.marketingOccasion.findMany({
      orderBy: [{ month: 'asc' }, { day: 'asc' }],
      include: { audienceBranch: true },
    });
  }

  createOccasion(dto: UpsertOccasionDto, createdBy: string) {
    return this.prisma.marketingOccasion.create({
      data: {
        name: dto.name,
        month: dto.month,
        day: dto.day,
        messageBody: dto.messageBody,
        active: dto.active ?? true,
        audienceBranchId: dto.audienceBranchId ?? null,
        createdBy,
      },
    });
  }

  async updateOccasion(id: string, dto: UpsertOccasionDto) {
    const existing = await this.prisma.marketingOccasion.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Occasion not found');
    return this.prisma.marketingOccasion.update({
      where: { id },
      data: {
        name: dto.name,
        month: dto.month,
        day: dto.day,
        messageBody: dto.messageBody,
        active: dto.active ?? existing.active,
        audienceBranchId: dto.audienceBranchId ?? null,
      },
    });
  }

  async deleteOccasion(id: string) {
    await this.prisma.marketingOccasion.delete({ where: { id } });
    return { success: true };
  }

  // Daily sweep: any active occasion whose month+day is today sends its
  // WhatsApp greeting to the past-client base (leads with at least one
  // booking), deduped per client per year so re-runs never double-send and
  // next year's occasion isn't blocked by this year's send.
  async checkOccasions() {
    const now = new Date();
    const month = now.getMonth() + 1;
    const day = now.getDate();
    const year = now.getFullYear();

    const occasions = await this.prisma.marketingOccasion.findMany({ where: { active: true, month, day } });
    for (const occ of occasions) {
      const leads = await this.prisma.lead.findMany({
        where: {
          branchId: occ.audienceBranchId ?? undefined,
          quotations: { some: { bookings: { some: {} } } },
        },
        select: { id: true, clientName: true, phone: true },
      });
      for (const lead of leads) {
        if (!lead.phone) continue;
        const relatedEntity = `occasion:${occ.id}:${year}:${lead.id}`;
        const already = await this.prisma.notification.findFirst({ where: { relatedEntity } });
        if (already) continue;
        await this.notifications.send({
          channel: 'WHATSAPP',
          triggerType: 'occasion_greeting',
          recipient: lead.phone,
          relatedEntity,
          body: interpolateTemplate(occ.messageBody, { name: lead.clientName }),
        });
      }
      this.logger.log(`Sent "${occ.name}" occasion greeting to ${leads.length} clients`);
    }
  }

  // ---- Staff-reviewed re-engagement (win-back) ----

  // Segment: one row per client whose most recent qualifying trip departed
  // between monthsAgoMin and monthsAgoMax months ago. Branch Managers only see
  // their own branch; consultants/others aren't given this endpoint.
  async reengagementPreview(dto: ReengagementPreviewDto, actor: Actor) {
    const now = new Date();
    const recentBoundary = new Date(now);
    recentBoundary.setMonth(recentBoundary.getMonth() - dto.monthsAgoMin);
    const oldBoundary = new Date(now);
    oldBoundary.setMonth(oldBoundary.getMonth() - dto.monthsAgoMax);
    const branchId = actor.role === Role.BRANCH_MANAGER ? actor.branchId ?? '__none__' : undefined;

    const bookings = await this.prisma.booking.findMany({
      where: {
        status: { in: ['CONFIRMED', 'COMPLETED'] },
        departureDate: { gte: oldBoundary, lte: recentBoundary },
        quotation: {
          lead: {
            branchId,
            destination: dto.pastDestination ? { contains: dto.pastDestination, mode: 'insensitive' } : undefined,
          },
        },
      },
      select: {
        departureDate: true,
        quotation: { select: { lead: { select: { id: true, clientName: true, phone: true, destination: true } } } },
      },
      orderBy: { departureDate: 'desc' },
    });

    const seen = new Set<string>();
    const rows: {
      leadId: string;
      clientName: string;
      phone: string;
      pastDestination: string;
      lastDepartureDate: Date;
    }[] = [];
    for (const b of bookings) {
      const lead = b.quotation.lead;
      if (seen.has(lead.id)) continue;
      seen.add(lead.id);
      rows.push({
        leadId: lead.id,
        clientName: lead.clientName,
        phone: lead.phone,
        pastDestination: lead.destination,
        lastDepartureDate: b.departureDate,
      });
    }
    return rows;
  }

  async reengagementSend(dto: ReengagementSendDto, actor: Actor) {
    const monthKey = new Date().toISOString().slice(0, 7); // yyyy-mm — one nudge per client per month
    const branchId = actor.role === Role.BRANCH_MANAGER ? actor.branchId ?? '__none__' : undefined;
    const leads = await this.prisma.lead.findMany({
      where: { id: { in: dto.leadIds }, branchId },
      select: { id: true, clientName: true, phone: true, destination: true },
    });

    let sent = 0;
    let skipped = 0;
    for (const lead of leads) {
      if (!lead.phone) {
        skipped++;
        continue;
      }
      const relatedEntity = `reengage:${lead.id}:${monthKey}`;
      const already = await this.prisma.notification.findFirst({ where: { relatedEntity } });
      if (already) {
        skipped++;
        continue;
      }
      await this.notifications.send({
        channel: 'WHATSAPP',
        triggerType: 'reengagement',
        recipient: lead.phone,
        relatedEntity,
        body: interpolateTemplate(dto.messageBody, {
          name: lead.clientName,
          pastDestination: lead.destination,
          newDestination: dto.newDestination ?? '',
        }),
      });
      sent++;
    }
    return { sent, skipped };
  }
}
