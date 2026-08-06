import { Module } from '@nestjs/common';
import { SupportTicketsController } from './support-tickets.controller';
import { SupportTicketsService } from './support-tickets.service';
import { PrismaService } from '../prisma.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [SupportTicketsController],
  providers: [SupportTicketsService, PrismaService],
})
export class SupportTicketsModule {}
