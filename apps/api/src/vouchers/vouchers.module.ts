import { Module } from '@nestjs/common';
import { VouchersController } from './vouchers.controller';
import { PublicVouchersController } from './public-vouchers.controller';
import { VouchersService } from './vouchers.service';
import { PrismaService } from '../prisma.service';
import { AuthModule } from '../auth/auth.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [AuthModule, NotificationsModule],
  controllers: [VouchersController, PublicVouchersController],
  providers: [VouchersService, PrismaService],
  exports: [VouchersService],
})
export class VouchersModule {}
