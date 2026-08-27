import { Module } from '@nestjs/common';
import { PayrollController } from './payroll.controller';
import { PayrollService } from './payroll.service';
import { PrismaService } from '../prisma.service';
import { AuthModule } from '../auth/auth.module';
import { HrSettingsModule } from '../hr-settings/hr-settings.module';

@Module({
  imports: [AuthModule, HrSettingsModule],
  controllers: [PayrollController],
  providers: [PayrollService, PrismaService],
})
export class PayrollModule {}
