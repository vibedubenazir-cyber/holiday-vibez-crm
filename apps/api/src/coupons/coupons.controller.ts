import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { CouponsService } from './coupons.service';
import { CreateCouponDto } from './dto/create-coupon.dto';
import { ValidateCouponDto } from './dto/validate-coupon.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

type AuthUser = { id: string; role: Role };
const ALL_ROLES = [Role.DIRECTOR, Role.ADMIN, Role.BRANCH_MANAGER, Role.TRAVEL_CONSULTANT, Role.FINANCE, Role.AUDITOR];
const MANAGE_ROLES = [Role.DIRECTOR, Role.ADMIN];
// Same as ALL_ROLES minus AUDITOR — auditors are read-only everywhere, and
// /validate is reached from the payment-building flow even though it has no
// side effects itself, so it stays off the read-only role's list.
const NON_AUDITOR_ROLES = ALL_ROLES.filter((r) => r !== Role.AUDITOR);

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('coupons')
export class CouponsController {
  constructor(private readonly couponsService: CouponsService) {}

  @Roles(...ALL_ROLES)
  @Get()
  findAll() {
    return this.couponsService.findAll();
  }

  @Roles(...MANAGE_ROLES)
  @Post()
  create(@Body() dto: CreateCouponDto, @CurrentUser() user: AuthUser) {
    return this.couponsService.create(dto, user.id);
  }

  @Roles(...MANAGE_ROLES)
  @Patch(':id/active')
  setActive(@Param('id') id: string, @Body('active') active: boolean) {
    return this.couponsService.setActive(id, active);
  }

  // All roles may preview a discount — a Travel Consultant is usually the one
  // entering the code while building a payment, not just Admin/Director.
  @Roles(...NON_AUDITOR_ROLES)
  @Post('validate')
  async validate(@Body() dto: ValidateCouponDto) {
    const { coupon, discountAmount, finalAmount } = await this.couponsService.computeDiscount(dto.code, dto.amount);
    return { valid: true, discountAmount, finalAmount, discountType: coupon.discountType, discountValue: coupon.discountValue };
  }
}
