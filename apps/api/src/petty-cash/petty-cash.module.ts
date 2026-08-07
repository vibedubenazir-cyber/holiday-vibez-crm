import { Module } from '@nestjs/common';
import { PettyCashController } from './petty-cash.controller';
import { PettyCashService } from './petty-cash.service';
import { PrismaService } from '../prisma.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [PettyCashController],
  providers: [PettyCashService, PrismaService],
  exports: [PettyCashService],
})
export class PettyCashModule {}
