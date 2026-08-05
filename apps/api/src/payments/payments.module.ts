import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { RazorpayWebhookController } from './razorpay-webhook.controller';
import { PaymentsService } from './payments.service';
import { PrismaService } from '../prisma.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [PaymentsController, RazorpayWebhookController],
  providers: [PaymentsService, PrismaService],
})
export class PaymentsModule {}
