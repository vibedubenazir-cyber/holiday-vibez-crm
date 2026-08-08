import { ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { NotificationChannel, Role } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { normalizePhone } from '../notifications/phone.util';
import { getLlmReply, LlmMessage } from './llm.util';

type Actor = { id: string; role: Role; branchId: string | null };

// Canned rule-based responder — the fallback when ANTHROPIC_API_KEY isn't set
// (also what runs if a real LLM call throws, so the bot never goes silent).
const BOT_RULES: { keywords: string[]; reply: string }[] = [
  { keywords: ['price', 'cost', 'quote'], reply: 'Thanks for reaching out! A consultant will share your quotation shortly.' },
  { keywords: ['hi', 'hello', 'hey'], reply: 'Hi! Thanks for messaging Holiday Vibez — how can we help with your trip?' },
];
const BOT_FALLBACK_REPLY = "Thanks for your message — a consultant will get back to you shortly.";
const LLM_HISTORY_LIMIT = 10;

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
      relatedMessageId: message.id,
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
    const last10 = normalized.slice(-10);
    // Phone isn't stored normalized (dashes/spaces/+ vary), so a raw `contains`
    // prefilter on the stored text can't reliably narrow this — e.g.
    // "+1-999-999-9999" has no 6 consecutive raw digits despite matching after
    // normalization. Selecting just id/phone (not full lead rows) keeps the
    // full-table read cheap without sacrificing correctness.
    const candidates = await this.prisma.lead.findMany({ select: { id: true, phone: true } });
    const matchIds = candidates.filter((l) => normalizePhone(l.phone).endsWith(last10)).map((l) => l.id);
    const matches = matchIds.length > 0 ? await this.prisma.lead.findMany({ where: { id: { in: matchIds } } }) : [];

    if (matches.length === 0) {
      this.logger.warn(`Inbound WhatsApp message from unrecognized number ${fromPhone} — no matching lead`);
      return null;
    }
    if (matches.length > 1) {
      // Ambiguous — e.g. two leads whose numbers share the same last-10-digit
      // local number under different country codes. Refuse rather than guess
      // and risk leaking one customer's message into a different lead's thread.
      this.logger.warn(
        `Inbound WhatsApp message from ${fromPhone} matched ${matches.length} leads (${matches.map((l) => l.id).join(', ')}) — refusing to guess`,
      );
      return null;
    }

    const lead = matches[0];
    const conversation = await this.ensureForLead(lead.id, 'WHATSAPP');
    return this.processInbound({ ...conversation, lead }, body, 'DELIVERED', true);
  }

  // Shared core for both the dev-simulate endpoint and the real webhook: records
  // the inbound message, runs the bot (real LLM reply when ANTHROPIC_API_KEY is
  // set, keyword-match fallback otherwise) if enabled, and — only when triggered
  // by a real webhook — actually sends the bot's reply back over WhatsApp, since
  // a real customer is on the other end.
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
      const replyBody = await this.generateBotReply(conversationId, body);
      botReply = await this.prisma.message.create({
        data: { conversationId, direction: 'OUTBOUND', body: replyBody, status: 'SENT', sentBy: null },
      });

      if (deliverBotReply) {
        await this.notifications.send({
          channel: conversation.channel,
          triggerType: 'inbox_bot_reply',
          recipient: conversation.channel === 'WHATSAPP' ? conversation.lead.phone : (conversation.lead.email ?? conversation.lead.phone),
          relatedEntity: `conversation:${conversationId}`,
          relatedMessageId: botReply.id,
          body: replyBody,
        });
      }
    }

    await this.prisma.conversation.update({ where: { id: conversationId }, data: { lastMessageAt: new Date() } });
    return { inbound, botReply };
  }

  // Real LLM reply when ANTHROPIC_API_KEY is set (recent conversation history
  // gives the model context), falling back to keyword matching otherwise — same
  // shape as an unconfigured/failed call to any other provider in this app, never
  // an error surfaced to the customer.
  private async generateBotReply(conversationId: string, latestInboundBody: string): Promise<string> {
    if (!process.env.ANTHROPIC_API_KEY) {
      return this.matchBotRule(latestInboundBody);
    }

    try {
      const recent = await this.prisma.message.findMany({
        where: { conversationId },
        orderBy: { createdAt: 'desc' },
        take: LLM_HISTORY_LIMIT,
      });
      const history: LlmMessage[] = recent
        .reverse()
        .map((m) => ({ role: m.direction === 'INBOUND' ? 'user' : 'assistant', content: m.body }));
      if (history.length === 0 || history[history.length - 1].role !== 'user') {
        history.push({ role: 'user', content: latestInboundBody });
      }
      return await getLlmReply(history);
    } catch (err) {
      this.logger.error('LLM bot reply failed, falling back to keyword match', err as Error);
      return this.matchBotRule(latestInboundBody);
    }
  }

  private matchBotRule(body: string): string {
    const lower = body.toLowerCase();
    const rule = BOT_RULES.find((r) => r.keywords.some((k) => lower.includes(k)));
    return rule?.reply ?? BOT_FALLBACK_REPLY;
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
