import { Module } from '@nestjs/common';
import { ExitManagementController } from './exit-management.controller';
import { ExitManagementService } from './exit-management.service';
import { PrismaService } from '../prisma.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [ExitManagementController],
  providers: [ExitManagementService, PrismaService],
})
export class ExitManagementModule {}
