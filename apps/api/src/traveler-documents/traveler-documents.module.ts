import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaService } from '../prisma.service';
import { TravelerAuthModule } from '../traveler-auth/traveler-auth.module';
import {
  StaffTravelerDocumentsController,
  TravelerDocumentsController,
} from './traveler-documents.controller';
import { TravelerDocumentsService } from './traveler-documents.service';

@Module({
  imports: [AuthModule, TravelerAuthModule],
  controllers: [TravelerDocumentsController, StaffTravelerDocumentsController],
  providers: [TravelerDocumentsService, PrismaService],
})
export class TravelerDocumentsModule {}
