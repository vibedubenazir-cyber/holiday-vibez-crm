import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { TravelerAuthModule } from '../traveler-auth/traveler-auth.module';
import { TravelerAppController } from './traveler-app.controller';
import { TravelerAppService } from './traveler-app.service';

@Module({
  imports: [TravelerAuthModule],
  controllers: [TravelerAppController],
  providers: [TravelerAppService, PrismaService],
})
export class TravelerAppModule {}
