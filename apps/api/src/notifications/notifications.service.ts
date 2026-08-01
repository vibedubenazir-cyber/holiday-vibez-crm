import { Injectable, Logger } from '@nestjs/common';
import { NotificationChannel } from '@prisma/client';
import { PrismaService } from '../prisma.service';

export interface SendNotificationInput {
  channel: NotificationChannel | 'WHATSAPP' | 'EMAIL' | 'PUSH';
  triggerType: string;
  recipient: string;
  relatedEntity?: string;
}

/**
 * Single service wrapping WhatsApp/email/push (spec Section 13: "never called
 * directly by other modules"). No WhatsApp/email/push credentials exist in this
 * environment, so delivery is a console-log + Notification row — swapping in a
 * real provider (Twilio/WhatsApp Cloud API, SES, FCM) means implementing this
 * class's `deliver` method only, not touching any caller.
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
    this.deliver(input);
    return notification;
  }

  async log(leadOrEntityId: string) {
    return this.prisma.notification.findMany({
      where: { relatedEntity: { contains: leadOrEntityId } },
      orderBy: { createdAt: 'desc' },
    });
  }

  private deliver(input: SendNotificationInput) {
    this.logger.log(`[${input.channel}] ${input.triggerType} -> ${input.recipient} (${input.relatedEntity ?? 'n/a'})`);
  }
}
