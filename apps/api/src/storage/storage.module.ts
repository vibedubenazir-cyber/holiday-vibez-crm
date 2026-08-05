import { Module } from '@nestjs/common';
import { StorageController } from './storage.controller';
import { AuthModule } from '../auth/auth.module';
import { PrismaService } from '../prisma.service';

@Module({
  imports: [AuthModule],
  controllers: [StorageController],
  providers: [PrismaService],
})
export class StorageModule {}
