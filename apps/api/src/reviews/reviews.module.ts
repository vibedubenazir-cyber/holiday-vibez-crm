import { Module } from '@nestjs/common';
import { ReviewsController, PublicReviewsController } from './reviews.controller';
import { ReviewsService } from './reviews.service';
import { PrismaService } from '../prisma.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [ReviewsController, PublicReviewsController],
  providers: [ReviewsService, PrismaService],
})
export class ReviewsModule {}
