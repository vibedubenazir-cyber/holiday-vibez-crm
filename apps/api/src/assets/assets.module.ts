import { Module } from '@nestjs/common';
import { AssetsController } from './assets.controller';
import { AssetsService } from './assets.service';
import { PrismaService } from '../prisma.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [AssetsController],
  providers: [AssetsService, PrismaService],
  // ExitManagementModule imports this to block clearance while the leaver
  // still holds company property.
  exports: [AssetsService],
})
export class AssetsModule {}
