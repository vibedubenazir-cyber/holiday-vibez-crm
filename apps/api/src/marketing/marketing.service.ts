import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateCampaignDto } from './dto/campaign.dto';

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

  // Mock send — resolves the audience from Leads matching the stored filters and
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

    const leads = await this.prisma.lead.findMany({
      where: {
        branchId: campaign.audienceBranchId ?? undefined,
        status: campaign.audienceLeadStatus ?? undefined,
      },
    });

    for (const lead of leads) {
      const recipient = campaign.channel === 'EMAIL' ? (lead.email ?? lead.phone) : lead.phone;
      await this.notifications.send({
        channel: campaign.channel,
        triggerType: 'campaign',
        recipient,
        relatedEntity: `campaign:${id}`,
        body: campaign.template?.body,
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
    for (const match of dueToday) {
      const traveler = await this.prisma.traveler.findUnique({ where: { id: match.travelerId }, include: { lead: true } });
      if (!traveler) continue;
      const isToday = (date: Date | null) => {
        if (!date) return false;
        const now = new Date();
        return date.getDate() === now.getDate() && date.getMonth() === now.getMonth();
      };
      if (isToday(traveler.dateOfBirth) || isToday(traveler.anniversaryDate)) {
        await this.notifications.send({
          channel: 'WHATSAPP',
          triggerType: isToday(traveler.dateOfBirth) ? 'birthday_greeting' : 'anniversary_greeting',
          recipient: traveler.phone ?? traveler.lead.phone,
          relatedEntity: `traveler:${traveler.id}`,
        });
        this.logger.log(`Sent greeting to ${traveler.name}`);
      }
    }
  }
}
