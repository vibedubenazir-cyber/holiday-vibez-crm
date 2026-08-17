import { Module } from '@nestjs/common';
import { RosterController } from './roster.controller';
import { RosterService } from './roster.service';
import { PrismaService } from '../prisma.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [RosterController],
  providers: [RosterService, PrismaService],
  exports: [RosterService],
})
export class RosterModule {}
