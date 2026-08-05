import { ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { NotificationChannel, Role } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { normalizePhone } from '../notifications/phone.util';

type Actor = { id: string; role: Role; branchId: string | null };

// Canned rule-based responder standing in for a real LLM bot (no AI/LLM credentials
// exist in this environment) — keyword match against the inbound body, default fallback.
const BOT_RULES: { keywords: string[]; reply: string }[] = [
  { keywords: ['price', 'cost', 'quote'], reply: 'Thanks for reaching out! A consultant will share your quotation shortly.' },
  { keywords: ['hi', 'hello', 'hey'], reply: 'Hi! Thanks for messaging Holiday Vibez — how can we help with your trip?' },
];
const BOT_FALLBACK_REPLY = "Thanks for your message — a consultant will get back to you shortly.";

@Injectable()
export class InboxService {
  private readonly logger = new Logger(InboxService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  findAll(filter: { branchId?: string; consultantId?: string; channel?: NotificationChannel }) {
    return this.prisma.conversation.findMany({
      where: {
        channel: filter.channel,
        lead: {
          assignedConsultantId: filter.consultantId,
          branchId: filter.branchId,
        },
      },
      include: {
        lead: true,
        messages: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
      orderBy: { lastMessageAt: 'desc' },
    });
  }

  async ensureForLead(leadId: string, channel: NotificationChannel) {
    const lead = await this.prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead) throw new NotFoundException('Lead not found');

    const existing = await this.prisma.conversation.findUnique({
      where: { leadId_channel: { leadId, channel } },
    });
    if (existing) return existing;

    return this.prisma.conversation.create({ data: { leadId, channel } });
  }

  async messages(conversationId: string, actor: Actor) {
    const conversation = await this.ensureConversationExists(conversationId);
    this.assertScope(actor, conversation.lead.assignedConsultantId, conversation.lead.branchId);
    return this.prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
      include: { sender: true },
    });
  }

  async sendMessage(conversationId: string, body: string, actor: Actor) {
    const conversation = await this.ensureConversationExists(conversationId);
    this.assertScope(actor, conversation.lead.assignedConsultantId, conversation.lead.branchId);
    const sentBy = actor.id;

    const message = await this.prisma.message.create({
      data: { conversationId, direction: 'OUTBOUND', body, sentBy, status: 'SENT' },
    });
    await this.prisma.conversation.update({ where: { id: conversationId }, data: { lastMessageAt: new Date() } });

    await this.notifications.send({
      channel: conversation.channel,
      triggerType: 'inbox_message',
      recipient: conversation.channel === 'WHATSAPP' ? conversation.lead.phone : (conversation.lead.email ?? conversation.lead.phone),
      relatedEntity: `conversation:${conversationId}`,
      body,
    });

    return message;
  }

  // Dev-only stand-in for a real WhatsApp webhook, still useful when no WhatsApp
  // credentials are configured. Actor-scoped (only staff who can see this
  // conversation can trigger it) and never delivers the bot reply anywhere real —
  // it's just for exercising the UI. Real inbound messages arrive via
  // receiveInboundWhatsApp() below, called from the webhook controller.
  async simulateInbound(conversationId: string, body: string, actor: Actor) {
    const conversation = await this.ensureConversationExists(conversationId);
    this.assertScope(actor, conversation.lead.assignedConsultantId, conversation.lead.branchId);
    return this.processInbound(conversation, body, 'DELIVERED', false);
  }

  // Real WhatsApp webhook entry point (see inbox/whatsapp-webhook.controller.ts).
  // Matches the inbound "from" number against Lead.phone (both normalized to
  // digits-only, since seeded/entered phones aren't consistently formatted) —
  // no actor to scope against, this is an unauthenticated request from Meta.
  async receiveInboundWhatsApp(fromPhone: string, body: string) {
    const normalized = normalizePhone(fromPhone);
    const leads = await this.prisma.lead.findMany();
    const lead = leads.find((l) => normalizePhone(l.phone).endsWith(normalized.slice(-10)));
    if (!lead) {
      this.logger.warn(`Inbound WhatsApp message from unrecognized number ${fromPhone} — no matching lead`);
      return null;
    }

    const conversation = await this.ensureForLead(lead.id, 'WHATSAPP');
    return this.processInbound({ ...conversation, lead }, body, 'DELIVERED', true);
  }

  // Shared core for both the dev-simulate endpoint and the real webhook: records
  // the inbound message, runs the keyword-match bot (standing in for a real LLM —
  // no AI/LLM credentials exist in this environment) if enabled, and — only when
  // triggered by a real webhook — actually sends the bot's reply back over
  // WhatsApp, since a real customer is on the other end.
  private async processInbound(
    conversation: { id: string; botEnabled: boolean; channel: NotificationChannel; lead: { phone: string; email: string | null } },
    body: string,
    status: 'SENT' | 'DELIVERED' | 'READ' | 'FAILED',
    deliverBotReply: boolean,
  ) {
    const conversationId = conversation.id;
    const inbound = await this.prisma.message.create({
      data: { conversationId, direction: 'INBOUND', body, status },
    });

    let botReply = null;
    if (conversation.botEnabled) {
      const lower = body.toLowerCase();
      const rule = BOT_RULES.find((r) => r.keywords.some((k) => lower.includes(k)));
      const replyBody = rule?.reply ?? BOT_FALLBACK_REPLY;
      botReply = await this.prisma.message.create({
        data: { conversationId, direction: 'OUTBOUND', body: replyBody, status: 'SENT', sentBy: null },
      });

      if (deliverBotReply) {
        await this.notifications.send({
          channel: conversation.channel,
          triggerType: 'inbox_bot_reply',
          recipient: conversation.channel === 'WHATSAPP' ? conversation.lead.phone : (conversation.lead.email ?? conversation.lead.phone),
          relatedEntity: `conversation:${conversationId}`,
          body: replyBody,
        });
      }
    }

    await this.prisma.conversation.update({ where: { id: conversationId }, data: { lastMessageAt: new Date() } });
    return { inbound, botReply };
  }

  async updateConversation(conversationId: string, botEnabled: boolean, actor: Actor) {
    const conversation = await this.ensureConversationExists(conversationId);
    this.assertScope(actor, conversation.lead.assignedConsultantId, conversation.lead.branchId);
    return this.prisma.conversation.update({ where: { id: conversationId }, data: { botEnabled } });
  }

  private assertScope(actor: Actor, consultantId: string | null, leadBranchId: string) {
    if (actor.role === Role.TRAVEL_CONSULTANT && actor.id !== consultantId) {
      throw new ForbiddenException('You can only access conversations for your own leads');
    }
    if (actor.role === Role.BRANCH_MANAGER && actor.branchId !== leadBranchId) {
      throw new ForbiddenException("You can only access conversations for your own branch's leads");
    }
  }

  private async ensureConversationExists(id: string) {
    const conversation = await this.prisma.conversation.findUnique({ where: { id }, include: { lead: true } });
    if (!conversation) throw new NotFoundException('Conversation not found');
    return conversation;
  }
}
