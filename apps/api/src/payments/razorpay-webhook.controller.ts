import { Controller, Post, RawBodyRequest, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';
import * as crypto from 'crypto';
import { PaymentsService } from './payments.service';

/**
 * Public, unauthenticated by design (no JwtAuthGuard) — Razorpay calls this
 * directly, so it's protected by signature verification instead. Mirrors
 * apps/api/src/inbox/whatsapp-webhook.controller.ts's shape exactly: verify
 * X-Razorpay-Signature (HMAC-SHA256 over the raw body using
 * PAYMENT_GATEWAY_WEBHOOK_SECRET), always ack 200 quickly (Razorpay retries
 * aggressively otherwise), skip verification with a logged warning if the
 * secret isn't configured yet (dev mode).
 */
@Controller('webhooks/razorpay')
export class RazorpayWebhookController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post()
  async receive(@Req() req: RawBodyRequest<Request>, @Res() res: Response) {
    res.status(200).send('OK');

    if (!this.verifySignature(req)) {
      console.error('Razorpay webhook: invalid signature, ignoring payload');
      return;
    }

    try {
      await this.processPayload(req.body);
    } catch (err) {
      console.error('Razorpay webhook: failed to process payload', err);
    }
  }

  private verifySignature(req: RawBodyRequest<Request>): boolean {
    const secret = process.env.PAYMENT_GATEWAY_WEBHOOK_SECRET;
    if (!secret) {
      console.warn('PAYMENT_GATEWAY_WEBHOOK_SECRET not configured — skipping webhook signature verification (dev mode)');
      return true;
    }
    const signature = req.headers['x-razorpay-signature'];
    if (typeof signature !== 'string' || !req.rawBody) return false;

    const expected = crypto.createHmac('sha256', secret).update(req.rawBody).digest('hex');
    try {
      return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
    } catch {
      return false;
    }
  }

  private async processPayload(body: any) {
    if (body?.event !== 'payment_link.paid') return;

    const linkEntity = body?.payload?.payment_link?.entity;
    const paymentEntity = body?.payload?.payment?.entity;
    if (!linkEntity?.id || !paymentEntity?.id) return;

    const updated = await this.paymentsService.confirmPaidByGatewayLinkId(linkEntity.id, paymentEntity.id);
    if (!updated) {
      console.warn(`Razorpay webhook: no matching/unpaid Payment for payment_link ${linkEntity.id}`);
    }
  }
}
