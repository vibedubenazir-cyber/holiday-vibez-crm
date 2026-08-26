import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { ReviewStatusDto } from './dto/review-status.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { RateLimitGuard } from '../common/guards/rate-limit.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

type AuthUser = { id: string; role: Role };
const ALL_ROLES = [Role.DIRECTOR, Role.ADMIN, Role.BRANCH_MANAGER, Role.TRAVEL_CONSULTANT];
const MODERATE_ROLES = [Role.DIRECTOR, Role.ADMIN];

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Roles(...MODERATE_ROLES)
  @Get('pending')
  findPending() {
    return this.reviewsService.findPending();
  }

  @Roles(...ALL_ROLES)
  @Get('booking/:bookingId')
  findForBooking(@Param('bookingId') bookingId: string) {
    return this.reviewsService.findForBooking(bookingId);
  }

  @Roles(...ALL_ROLES)
  @Post('booking/:bookingId')
  create(@Param('bookingId') bookingId: string, @Body() dto: CreateReviewDto, @CurrentUser() user: AuthUser) {
    return this.reviewsService.create(bookingId, dto, user.id);
  }

  @Roles(...MODERATE_ROLES)
  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body() dto: ReviewStatusDto) {
    return this.reviewsService.updateStatus(id, dto);
  }
}

// Unauthenticated, so it carries the same RateLimitGuard as the other public
// endpoints — without it, this was an open, uncapped drain of customer data.
@UseGuards(RateLimitGuard)
@Controller('public/reviews')
export class PublicReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Get()
  findApprovedForDestination(@Query('destination') destination: string) {
    return this.reviewsService.findApprovedForDestination(destination);
  }
}
