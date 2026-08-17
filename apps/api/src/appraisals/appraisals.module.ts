import { Module } from '@nestjs/common';
import { AppraisalsController } from './appraisals.controller';
import { AppraisalsService } from './appraisals.service';
import { PrismaService } from '../prisma.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [AppraisalsController],
  providers: [AppraisalsService, PrismaService],
})
export class AppraisalsModule {}
