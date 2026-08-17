import { Module } from '@nestjs/common';
import { LeaveController } from './leave.controller';
import { LeaveService } from './leave.service';
import { PrismaService } from '../prisma.service';
import { AuthModule } from '../auth/auth.module';
import { HrSettingsModule } from '../hr-settings/hr-settings.module';
import { HrCalendarModule } from '../hr-calendar/hr-calendar.module';

@Module({
  imports: [AuthModule, HrSettingsModule, HrCalendarModule],
  controllers: [LeaveController],
  providers: [LeaveService, PrismaService],
})
export class LeaveModule {}
