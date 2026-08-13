import { Module } from '@nestjs/common';
import { HrSettingsController } from './hr-settings.controller';
import { HrSettingsService } from './hr-settings.service';
import { PrismaService } from '../prisma.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [HrSettingsController],
  providers: [HrSettingsService, PrismaService],
  exports: [HrSettingsService],
})
export class HrSettingsModule {}
