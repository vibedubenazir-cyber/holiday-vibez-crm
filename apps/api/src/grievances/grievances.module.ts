import { Module } from '@nestjs/common';
import { GrievancesController } from './grievances.controller';
import { GrievancesService } from './grievances.service';
import { PrismaService } from '../prisma.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [GrievancesController],
  providers: [GrievancesService, PrismaService],
})
export class GrievancesModule {}
