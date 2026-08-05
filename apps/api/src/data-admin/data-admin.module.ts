import { Module } from '@nestjs/common';
import { DataAdminController } from './data-admin.controller';
import { DataAdminService } from './data-admin.service';
import { PrismaService } from '../prisma.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [DataAdminController],
  providers: [DataAdminService, PrismaService],
})
export class DataAdminModule {}
