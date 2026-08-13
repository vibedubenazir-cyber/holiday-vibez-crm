import { Module } from '@nestjs/common';
import { ReimbursementsController } from './reimbursements.controller';
import { ReimbursementsService } from './reimbursements.service';
import { PrismaService } from '../prisma.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [ReimbursementsController],
  providers: [ReimbursementsService, PrismaService],
})
export class ReimbursementsModule {}
