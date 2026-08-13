import { Module } from '@nestjs/common';
import { LeaveController } from './leave.controller';
import { LeaveService } from './leave.service';
import { PrismaService } from '../prisma.service';
import { AuthModule } from '../auth/auth.module';
import { HrSettingsModule } from '../hr-settings/hr-settings.module';

@Module({
  imports: [AuthModule, HrSettingsModule],
  controllers: [LeaveController],
  providers: [LeaveService, PrismaService],
})
export class LeaveModule {}
