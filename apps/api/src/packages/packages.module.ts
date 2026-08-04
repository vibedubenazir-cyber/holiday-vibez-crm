import { Module } from '@nestjs/common';
import { PackagesController } from './packages.controller';
import { PackagesService } from './packages.service';
import { PrismaService } from '../prisma.service';
import { AuthModule } from '../auth/auth.module';
import { QuotationsModule } from '../quotations/quotations.module';

@Module({
  imports: [AuthModule, QuotationsModule],
  controllers: [PackagesController],
  providers: [PackagesService, PrismaService],
  exports: [PackagesService],
})
export class PackagesModule {}
