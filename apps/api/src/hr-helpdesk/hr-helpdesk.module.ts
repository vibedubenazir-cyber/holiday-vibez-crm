import { Module } from '@nestjs/common';
import { HrHelpdeskController } from './hr-helpdesk.controller';
import { HrHelpdeskService } from './hr-helpdesk.service';
import { PrismaService } from '../prisma.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [HrHelpdeskController],
  providers: [HrHelpdeskService, PrismaService],
})
export class HrHelpdeskModule {}
