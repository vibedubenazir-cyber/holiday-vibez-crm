import { Module } from '@nestjs/common';
import { StorageController } from './storage.controller';
import { UploadsRedirectController } from './uploads-redirect.controller';
import { AuthModule } from '../auth/auth.module';
import { PrismaService } from '../prisma.service';

@Module({
  imports: [AuthModule],
  controllers: [StorageController, UploadsRedirectController],
  providers: [PrismaService],
})
export class StorageModule {}
