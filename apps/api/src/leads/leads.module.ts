import { Module } from '@nestjs/common';
import { LeadsController } from './leads.controller';
import { PublicLeadsController } from './public-leads.controller';
import { LeadsService } from './leads.service';
import { TravelersController } from './travelers.controller';
import { TravelersService } from './travelers.service';
import { PrismaService } from '../prisma.service';
import { AuthModule } from '../auth/auth.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [AuthModule, NotificationsModule],
  controllers: [LeadsController, PublicLeadsController, TravelersController],
  providers: [LeadsService, TravelersService, PrismaService],
  exports: [LeadsService],
})
export class LeadsModule {}
