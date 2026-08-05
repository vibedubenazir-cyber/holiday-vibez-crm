import { Injectable, Logger } from '@nestjs/common';
import { NotificationChannel } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { normalizePhone } from './phone.util';

const WHATSAPP_API_VERSION = 'v20.0';

export interface SendNotificationInput {
  channel: NotificationChannel | 'WHATSAPP' | 'EMAIL' | 'PUSH';
  triggerType: string;
  recipient: string;
  relatedEntity?: string;
  // Actual message text. Optional because internal staff PUSH notifications
  // (lead_assigned, sla_breach_escalation, quotation_pending_approval) don't
  // need customer-facing copy — only WhatsApp/email sends require it to
  // actually transmit something.
  body?: string;
}

/**
 * Single service wrapping WhatsApp/email/push (spec Section 13: "never called
 * directly by other modules"). WhatsApp sends via Meta's Cloud API when
 * WHATSAPP_API_KEY + WHATSAPP_PHONE_NUMBER_ID are configured; email/push and
 * WhatsApp-without-credentials still fall back to a console-log + Notification
 * row, so nothing breaks before real credentials exist. Swapping in a real
 * email/push provider (SES, FCM) means extending this class's `deliver`
 * method only, not touching any caller.
 *
 * Known limitation: Meta requires a pre-approved message *template* (not free
 * text) for business-initiated messages outside a 24h customer-service window
 * (i.e. a campaign/automation rule firing without a recent inbound message
 * from that lead) — mapping this app's Template rows to real Meta-approved
 * template names is a manual approval step at Meta, not something this class
 * can work around. Free text works for Inbox replies (within an active
 * conversation) and any send that follows a recent inbound message.
 */
@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async send(input: SendNotificationInput) {
    const notification = await this.prisma.notification.create({
      data: {
        channel: input.channel as NotificationChannel,
        triggerType: input.triggerType,
        recipient: input.recipient,
        relatedEntity: input.relatedEntity,
        status: 'SENT',
      },
    });
    // Fire-and-forget — callers (booking/lead/quotation flows) shouldn't wait
    // on WhatsApp API latency. deliver() updates the Notification row itself
    // once the send actually completes.
    this.deliver(notification.id, input);
    return notification;
  }

  async log(leadOrEntityId: string) {
    return this.prisma.notification.findMany({
      where: { relatedEntity: { contains: leadOrEntityId } },
      orderBy: { createdAt: 'desc' },
    });
  }

  private async deliver(notificationId: string, input: SendNotificationInput) {
    if (input.channel === 'WHATSAPP' && process.env.WHATSAPP_API_KEY && process.env.WHATSAPP_PHONE_NUMBER_ID) {
      await this.sendWhatsApp(notificationId, input);
      return;
    }
    this.logger.log(`[${input.channel}] ${input.triggerType} -> ${input.recipient} (${input.relatedEntity ?? 'n/a'})`);
  }

  private async sendWhatsApp(notificationId: string, input: SendNotificationInput) {
    const url = `https://graph.facebook.com/${WHATSAPP_API_VERSION}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`;
    const body = input.body ?? `Holiday Vibez: ${input.triggerType.replace(/_/g, ' ')}`;

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.WHATSAPP_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: normalizePhone(input.recipient),
          type: 'text',
          text: { body },
        }),
      });

      const payload = await res.json().catch(() => null);
      if (!res.ok) {
        this.logger.error(`WhatsApp send failed (${res.status}) for notification ${notificationId}: ${JSON.stringify(payload)}`);
        await this.prisma.notification.update({ where: { id: notificationId }, data: { status: 'FAILED' } });
        return;
      }

      const externalId: string | undefined = payload?.messages?.[0]?.id;
      if (externalId) {
        await this.prisma.notification.update({ where: { id: notificationId }, data: { externalId } });
      }
    } catch (err) {
      this.logger.error(`WhatsApp send threw for notification ${notificationId}`, err as Error);
      await this.prisma.notification.update({ where: { id: notificationId }, data: { status: 'FAILED' } });
    }
  }
}
