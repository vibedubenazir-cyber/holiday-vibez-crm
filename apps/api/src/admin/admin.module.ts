import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { BranchesController } from './branches.controller';
import { BranchesService } from './branches.service';
import { RateCardsController } from './rate-cards.controller';
import { RateCardsService } from './rate-cards.service';
import { PrismaService } from '../prisma.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [UsersController, BranchesController, RateCardsController],
  providers: [UsersService, BranchesService, RateCardsService, PrismaService],
})
export class AdminModule {}
