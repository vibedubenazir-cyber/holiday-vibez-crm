import { Injectable, Logger } from '@nestjs/common';
import { NotificationChannel } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { normalizePhone } from './phone.util';
import { getFcmAccessToken } from './fcm.util';

const WHATSAPP_API_VERSION = 'v20.0';
const SENDGRID_API_URL = 'https://api.sendgrid.com/v3/mail/send';

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
  // Email-only. Falls back to a generic subject derived from triggerType if
  // omitted, same as `body`'s fallback.
  subject?: string;
}

/**
 * Single service wrapping WhatsApp/email/push (spec Section 13: "never called
 * directly by other modules"). WhatsApp sends via Meta's Cloud API when
 * WHATSAPP_API_KEY + WHATSAPP_PHONE_NUMBER_ID are configured; email sends via
 * SendGrid when EMAIL_PROVIDER_KEY + EMAIL_FROM_ADDRESS are configured. Push,
 * and either channel without credentials, still fall back to a console-log +
 * Notification row, so nothing breaks before real credentials exist. Swapping
 * in a real push provider (FCM) means extending this class's `deliver` method
 * only, not touching any caller.
 *
 * Known limitation: Meta requires a pre-approved message *template* (not free
 * text) for business-initiated messages outside a 24h customer-service window
 * (i.e. a campaign/automation rule firing without a recent inbound message
 * from that lead) — mapping this app's Template rows to real Meta-approved
 * template names is a manual approval step at Meta, not something this class
 * can work around. Free text works for Inbox replies (within an active
 * conversation) and any send that follows a recent inbound message. Email has
 * no such restriction — SendGrid accepts free text at any time.
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
    // recipient is `lead.email ?? lead.phone` at every EMAIL call site — only
    // attempt a real send when it's actually an email address.
    if (input.channel === 'EMAIL' && process.env.EMAIL_PROVIDER_KEY && process.env.EMAIL_FROM_ADDRESS && input.recipient.includes('@')) {
      await this.sendEmail(notificationId, input);
      return;
    }
    if (input.channel === 'PUSH' && process.env.FCM_PROJECT_ID && process.env.FCM_CLIENT_EMAIL && process.env.FCM_PRIVATE_KEY) {
      await this.sendPush(notificationId, input);
      return;
    }
    this.logger.log(`[${input.channel}] ${input.triggerType} -> ${input.recipient} (${input.relatedEntity ?? 'n/a'})`);
  }

  // Registers/updates the calling user's FCM registration token, obtained
  // client-side from Firebase's Web SDK once they opt into push notifications
  // on /security (apps/web/src/lib/push.ts).
  registerPushToken(userId: string, token: string) {
    return this.prisma.user.update({ where: { id: userId }, data: { fcmToken: token } });
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

  private async sendEmail(notificationId: string, input: SendNotificationInput) {
    const subject = input.subject ?? `Holiday Vibez: ${input.triggerType.replace(/_/g, ' ')}`;
    const body = input.body ?? subject;

    try {
      const res = await fetch(SENDGRID_API_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.EMAIL_PROVIDER_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          personalizations: [{ to: [{ email: input.recipient }] }],
          from: { email: process.env.EMAIL_FROM_ADDRESS },
          subject,
          content: [{ type: 'text/plain', value: body }],
        }),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => '');
        this.logger.error(`Email send failed (${res.status}) for notification ${notificationId}: ${text}`);
        await this.prisma.notification.update({ where: { id: notificationId }, data: { status: 'FAILED' } });
        return;
      }

      // SendGrid's mail/send returns 202 with no body and no message id in the
      // response — it reports one asynchronously via the separate Event Webhook,
      // which isn't wired up here. Notification stays at its initial SENT status;
      // there's no externalId to correlate a later delivery/bounce callback to.
      await this.prisma.notification.update({ where: { id: notificationId }, data: { status: 'SENT' } });
    } catch (err) {
      this.logger.error(`Email send threw for notification ${notificationId}`, err as Error);
      await this.prisma.notification.update({ where: { id: notificationId }, data: { status: 'FAILED' } });
    }
  }

  // Push recipient is always a User id (staff-facing: lead assigned, SLA
  // breach, approval needed — never customer-facing). Falls back to the
  // console-log path (not a failure) when the user hasn't opted into push yet,
  // same graceful-degradation shape as WhatsApp/email without credentials.
  private async sendPush(notificationId: string, input: SendNotificationInput) {
    const user = await this.prisma.user.findUnique({ where: { id: input.recipient } });
    if (!user?.fcmToken) {
      this.logger.log(`[PUSH] ${input.triggerType} -> ${input.recipient} (no fcmToken registered, ${input.relatedEntity ?? 'n/a'})`);
      return;
    }

    const title = input.subject ?? `Holiday Vibez: ${input.triggerType.replace(/_/g, ' ')}`;
    const body = input.body ?? title;

    try {
      const accessToken = await getFcmAccessToken();
      const res = await fetch(`https://fcm.googleapis.com/v1/projects/${process.env.FCM_PROJECT_ID}/messages:send`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: {
            token: user.fcmToken,
            notification: { title, body },
            data: input.relatedEntity ? { relatedEntity: input.relatedEntity } : undefined,
          },
        }),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => '');
        this.logger.error(`Push send failed (${res.status}) for notification ${notificationId}: ${text}`);
        await this.prisma.notification.update({ where: { id: notificationId }, data: { status: 'FAILED' } });
        return;
      }

      await this.prisma.notification.update({ where: { id: notificationId }, data: { status: 'SENT' } });
    } catch (err) {
      this.logger.error(`Push send threw for notification ${notificationId}`, err as Error);
      await this.prisma.notification.update({ where: { id: notificationId }, data: { status: 'FAILED' } });
    }
  }
}
