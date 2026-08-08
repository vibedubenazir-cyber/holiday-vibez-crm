import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { CreateCouponDto } from './dto/create-coupon.dto';

@Injectable()
export class CouponsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.coupon.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async create(dto: CreateCouponDto, createdBy: string) {
    const existing = await this.prisma.coupon.findUnique({ where: { code: dto.code } });
    if (existing) throw new BadRequestException(`Coupon code "${dto.code}" already exists`);
    return this.prisma.coupon.create({
      data: {
        code: dto.code,
        discountType: dto.discountType,
        discountValue: dto.discountValue,
        validFrom: new Date(dto.validFrom),
        validTo: new Date(dto.validTo),
        usageLimit: dto.usageLimit,
        createdBy,
      },
    });
  }

  async setActive(id: string, active: boolean) {
    const coupon = await this.prisma.coupon.findUnique({ where: { id } });
    if (!coupon) throw new NotFoundException('Coupon not found');
    return this.prisma.coupon.update({ where: { id }, data: { active } });
  }

  // Pure computation, no side effects — used both for the "preview discount
  // before saving" endpoint and internally by PaymentsService right before it
  // actually redeems the coupon (see redeem() below), so the two never
  // compute the discount differently.
  async computeDiscount(code: string, amount: number) {
    const coupon = await this.prisma.coupon.findUnique({ where: { code: code.toUpperCase() } });
    if (!coupon) throw new BadRequestException('Coupon code not found');
    if (!coupon.active) throw new BadRequestException('This coupon is no longer active');
    const now = new Date();
    if (now < coupon.validFrom || now > coupon.validTo) {
      throw new BadRequestException('This coupon is outside its valid date range');
    }
    if (coupon.usageLimit !== null && coupon.usedCount >= coupon.usageLimit) {
      throw new BadRequestException('This coupon has reached its usage limit');
    }
    const rawDiscount =
      coupon.discountType === 'PERCENTAGE' ? (amount * Number(coupon.discountValue)) / 100 : Number(coupon.discountValue);
    const discountAmount = Math.min(rawDiscount, amount);
    const finalAmount = Math.round((amount - discountAmount) * 100) / 100;
    return { coupon, discountAmount: Math.round(discountAmount * 100) / 100, finalAmount };
  }

  // Actually consumes one use — call only at the moment a Payment is created,
  // never from the preview/validate endpoint (which must stay side-effect-free
  // since a consultant may check several codes before picking one).
  //
  // The limit check and the increment happen in one conditional UPDATE
  // (re-checking usedCount < usageLimit in the WHERE clause) rather than
  // trusting computeDiscount()'s earlier read — two concurrent payments for
  // the same usageLimit:1 coupon would otherwise both pass that earlier
  // check before either commits its increment. Callers should run this
  // inside the same transaction as the Payment create so a failed payment
  // never burns a use (see PaymentsService.create()).
  async redeem(couponId: string, client: Prisma.TransactionClient | PrismaService = this.prisma) {
    const coupon = await client.coupon.findUniqueOrThrow({ where: { id: couponId } });
    const { count } = await client.coupon.updateMany({
      where: {
        id: couponId,
        OR: [{ usageLimit: null }, { usedCount: { lt: coupon.usageLimit ?? undefined } }],
      },
      data: { usedCount: { increment: 1 } },
    });
    if (count === 0) throw new BadRequestException('This coupon has reached its usage limit');
  }
}
