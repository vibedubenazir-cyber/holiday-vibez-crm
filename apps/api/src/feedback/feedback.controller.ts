import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { FeedbackService } from './feedback.service';
import { CreateFeedbackDto } from './dto/create-feedback.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

type AuthUser = { id: string; role: Role };
const ALL_ROLES = [Role.DIRECTOR, Role.ADMIN, Role.BRANCH_MANAGER, Role.TRAVEL_CONSULTANT];

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('feedback')
export class FeedbackController {
  constructor(private readonly feedbackService: FeedbackService) {}

  @Roles(...ALL_ROLES)
  @Get('summary')
  summary() {
    return this.feedbackService.summary();
  }

  @Roles(...ALL_ROLES)
  @Get('booking/:bookingId')
  findForBooking(@Param('bookingId') bookingId: string) {
    return this.feedbackService.findForBooking(bookingId);
  }

  @Roles(...ALL_ROLES)
  @Post('booking/:bookingId')
  create(@Param('bookingId') bookingId: string, @Body() dto: CreateFeedbackDto, @CurrentUser() user: AuthUser) {
    return this.feedbackService.create(bookingId, dto, user.id);
  }
}
