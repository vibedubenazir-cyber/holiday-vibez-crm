import { Module } from '@nestjs/common';
import { QuotationsController } from './quotations.controller';
import { PublicQuotationController } from './public-quotation.controller';
import { QuotationsService } from './quotations.service';
import { PrismaService } from '../prisma.service';
import { AuthModule } from '../auth/auth.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [AuthModule, NotificationsModule],
  controllers: [QuotationsController, PublicQuotationController],
  providers: [QuotationsService, PrismaService],
  exports: [QuotationsService],
})
export class QuotationsModule {}
