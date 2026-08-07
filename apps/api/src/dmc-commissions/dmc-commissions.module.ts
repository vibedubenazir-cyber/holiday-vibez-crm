import { Module } from '@nestjs/common';
import { DmcCommissionsController } from './dmc-commissions.controller';
import { DmcCommissionsService } from './dmc-commissions.service';
import { PrismaService } from '../prisma.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [DmcCommissionsController],
  providers: [DmcCommissionsService, PrismaService],
  exports: [DmcCommissionsService],
})
export class DmcCommissionsModule {}
