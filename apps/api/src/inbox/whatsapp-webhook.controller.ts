import { Controller, Get, Post, Query, RawBodyRequest, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma.service';
import { InboxService } from './inbox.service';

/**
 * Public, unauthenticated by design (no JwtAuthGuard) — Meta calls this directly,
 * so it's protected by Meta's own verification instead: the GET handshake checks
 * a shared verify token, and every POST is checked against X-Hub-Signature-256
 * (HMAC-SHA256 over the raw body using the Meta App secret). Mirrors
 * PublicLeadsController's pattern of an `if (expected)` check that no-ops (with a
 * logged warning) when the corresponding secret isn't configured yet, so this
 * endpoint's shape can be exercised before real WhatsApp credentials exist.
 */
@Controller('webhooks/whatsapp')
export class WhatsappWebhookController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly inboxService: InboxService,
  ) {}

  @Get()
  verify(
    @Query('hub.mode') mode: string | undefined,
    @Query('hub.verify_token') token: string | undefined,
    @Query('hub.challenge') challenge: string | undefined,
    @Res() res: Response,
  ) {
    const expected = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN;
    if (mode === 'subscribe' && expected && token === expected) {
      res.status(200).send(challenge);
      return;
    }
    res.status(403).send('Verification failed');
  }

  @Post()
  async receive(@Req() req: RawBodyRequest<Request>, @Res() res: Response) {
    // Meta retries aggressively on anything but a quick 200, so this always
    // acknowledges immediately and logs/ignores anything it can't process.
    res.status(200).send('OK');

    if (!this.verifySignature(req)) {
      console.error('WhatsApp webhook: invalid signature, ignoring payload');
      return;
    }

    try {
      await this.processPayload(req.body);
    } catch (err) {
      console.error('WhatsApp webhook: failed to process payload', err);
    }
  }

  private verifySignature(req: RawBodyRequest<Request>): boolean {
    const secret = process.env.WHATSAPP_APP_SECRET;
    if (!secret) {
      console.warn('WHATSAPP_APP_SECRET not configured — skipping webhook signature verification (dev mode)');
      return true;
    }
    const signature = req.headers['x-hub-signature-256'];
    if (typeof signature !== 'string' || !req.rawBody) return false;

    const expected = 'sha256=' + crypto.createHmac('sha256', secret).update(req.rawBody).digest('hex');
    try {
      return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
    } catch {
      return false;
    }
  }

  // Meta's webhook payload shape: entry[].changes[].value contains either
  // inbound "messages" or delivery/read "statuses" — never both in one change.
  private async processPayload(body: any) {
    const changes = body?.entry?.flatMap((e: any) => e.changes ?? []) ?? [];
    for (const change of changes) {
      const value = change.value ?? {};
      for (const message of value.messages ?? []) {
        if (message.type === 'text' && message.from && message.text?.body) {
          await this.inboxService.receiveInboundWhatsApp(message.from, message.text.body);
        }
      }
      for (const status of value.statuses ?? []) {
        await this.applyStatus(status.id, status.status);
      }
    }
  }

  private async applyStatus(externalId: string | undefined, status: string | undefined) {
    if (!externalId || !status) return;
    const mapped = { sent: 'SENT', delivered: 'DELIVERED', read: 'READ', failed: 'FAILED' }[status];
    if (!mapped) return;

    const notification = await this.prisma.notification.findFirst({ where: { externalId } });
    if (!notification) return;

    await this.prisma.notification.update({ where: { id: notification.id }, data: { status: mapped as any } });

    // Best-effort: also reflect the status on the matching outbound Message, if
    // this notification came from an Inbox conversation.
    if (notification.relatedEntity?.startsWith('conversation:')) {
      const conversationId = notification.relatedEntity.slice('conversation:'.length);
      const lastOutbound = await this.prisma.message.findFirst({
        where: { conversationId, direction: 'OUTBOUND' },
        orderBy: { createdAt: 'desc' },
      });
      if (lastOutbound) {
        await this.prisma.message.update({ where: { id: lastOutbound.id }, data: { status: mapped as any } });
      }
    }
  }
}
