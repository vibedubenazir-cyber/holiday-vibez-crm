import { Module } from '@nestjs/common';
import { EmployeesController } from './employees.controller';
import { EmployeesService } from './employees.service';
import { PrismaService } from '../prisma.service';
import { AuthModule } from '../auth/auth.module';
import { HrSettingsModule } from '../hr-settings/hr-settings.module';

@Module({
  imports: [AuthModule, HrSettingsModule],
  controllers: [EmployeesController],
  providers: [EmployeesService, PrismaService],
})
export class EmployeesModule {}
