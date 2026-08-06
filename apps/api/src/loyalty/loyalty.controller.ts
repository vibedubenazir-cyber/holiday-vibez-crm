import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { LoyaltyService } from './loyalty.service';
import { PointsAdjustmentDto } from './dto/points-adjustment.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

type AuthUser = { id: string; role: Role };
const ALL_ROLES = [Role.DIRECTOR, Role.ADMIN, Role.BRANCH_MANAGER, Role.TRAVEL_CONSULTANT];
const MANAGE_ROLES = [Role.DIRECTOR, Role.ADMIN, Role.BRANCH_MANAGER];

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('loyalty')
export class LoyaltyController {
  constructor(private readonly loyaltyService: LoyaltyService) {}

  @Roles(...ALL_ROLES)
  @Get(':clientId')
  find(@Param('clientId') clientId: string) {
    return this.loyaltyService.findByClient(clientId);
  }

  @Roles(...MANAGE_ROLES)
  @Post(':clientId/earn')
  earn(@Param('clientId') clientId: string, @Body() dto: PointsAdjustmentDto, @CurrentUser() user: AuthUser) {
    return this.loyaltyService.earn(clientId, dto, user.id);
  }

  @Roles(...MANAGE_ROLES)
  @Post(':clientId/redeem')
  redeem(@Param('clientId') clientId: string, @Body() dto: PointsAdjustmentDto, @CurrentUser() user: AuthUser) {
    return this.loyaltyService.redeem(clientId, dto, user.id);
  }

  @Roles(...MANAGE_ROLES)
  @Post(':clientId/referral-bonus')
  referralBonus(@Param('clientId') clientId: string, @Body() dto: PointsAdjustmentDto, @CurrentUser() user: AuthUser) {
    return this.loyaltyService.referralBonus(clientId, dto, user.id);
  }
}
