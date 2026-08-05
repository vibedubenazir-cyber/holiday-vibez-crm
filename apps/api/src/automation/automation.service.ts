import { Injectable, Logger } from '@nestjs/common';
import { AutomationRule } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateAutomationRuleDto, UpdateAutomationRuleDto } from './dto/automation.dto';

@Injectable()
export class AutomationService {
  private readonly logger = new Logger(AutomationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  findAllRules() {
    return this.prisma.automationRule.findMany({
      include: { template: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  createRule(dto: CreateAutomationRuleDto, createdBy: string) {
    return this.prisma.automationRule.create({
      data: {
        name: dto.name,
        trigger: dto.trigger,
        targetLeadStatus: dto.targetLeadStatus,
        delayMinutes: dto.delayMinutes ?? 0,
        channel: dto.channel,
        templateId: dto.templateId,
        createdBy,
      },
    });
  }

  updateRule(id: string, dto: UpdateAutomationRuleDto) {
    return this.prisma.automationRule.update({ where: { id }, data: dto });
  }

  findLogs(ruleId?: string) {
    return this.prisma.automationLog.findMany({
      where: { ruleId },
      include: { lead: true, rule: true },
      orderBy: { firedAt: 'desc' },
      take: 100,
    });
  }

  // Single sweep evaluating every active rule against Leads — the general-purpose
  // successor to the hardcoded SLA-escalation and birthday intervals (see main.ts),
  // so adding a new trigger scenario is an Admin creating a rule, not a code change.
  async runSweep() {
    const rules = await this.prisma.automationRule.findMany({ where: { active: true } });
    for (const rule of rules) {
      try {
        await this.evaluateRule(rule);
      } catch (err) {
        this.logger.error(`Automation rule ${rule.id} failed`, err as Error);
      }
    }
  }

  private async evaluateRule(rule: AutomationRule) {
    const cutoff = new Date(Date.now() - rule.delayMinutes * 60 * 1000);
    const alreadyFired = (await this.prisma.automationLog.findMany({ where: { ruleId: rule.id } })).map((l) => l.leadId);

    let candidateLeadIds: string[] = [];

    if (rule.trigger === 'LEAD_CREATED') {
      const leads = await this.prisma.lead.findMany({ where: { createdAt: { lte: cutoff } } });
      candidateLeadIds = leads.map((l) => l.id);
    } else if (rule.trigger === 'LEAD_STATUS_CHANGED') {
      const leads = await this.prisma.lead.findMany({
        where: { status: rule.targetLeadStatus ?? undefined, updatedAt: { lte: cutoff } },
      });
      candidateLeadIds = leads.map((l) => l.id);
    } else if (rule.trigger === 'QUOTATION_SENT') {
      const quotations = await this.prisma.quotation.findMany({
        where: { status: 'SENT', approvedAt: { lte: cutoff } },
      });
      candidateLeadIds = quotations.map((q) => q.leadId);
    } else if (rule.trigger === 'BOOKING_CONFIRMED') {
      const bookings = await this.prisma.booking.findMany({
        where: { createdAt: { lte: cutoff } },
        include: { quotation: true },
      });
      candidateLeadIds = bookings.map((b) => b.quotation.leadId);
    }

    const toFire = [...new Set(candidateLeadIds)].filter((id) => !alreadyFired.includes(id));
    if (toFire.length === 0) return;

    const leads = await this.prisma.lead.findMany({ where: { id: { in: toFire } } });
    const template = rule.templateId ? await this.prisma.template.findUnique({ where: { id: rule.templateId } }) : null;

    for (const lead of leads) {
      const recipient = rule.channel === 'EMAIL' ? (lead.email ?? lead.phone) : lead.phone;
      await this.notifications.send({
        channel: rule.channel,
        triggerType: `automation:${rule.name}`,
        recipient,
        relatedEntity: `lead:${lead.id}`,
        body: template?.body ?? `Hi ${lead.clientName}, following up on your ${lead.destination} trip — let us know if you have any questions!`,
        subject: template?.subject ?? `Following up on your ${lead.destination} trip`,
      });
      await this.prisma.automationLog.create({ data: { ruleId: rule.id, leadId: lead.id, status: 'SENT' } });
      this.logger.log(`Rule "${rule.name}" fired for lead ${lead.id}${template ? ` (template: ${template.name})` : ''}`);
    }
  }
}
