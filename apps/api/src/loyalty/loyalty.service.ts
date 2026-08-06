import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { PointsAdjustmentDto } from './dto/points-adjustment.dto';

// Membership tiers by lifetime points earned (never decreases on redemption,
// so a customer doesn't get demoted just for spending points) — fixed
// thresholds, no per-org configuration screen for this MVP.
export function tierForLifetimePoints(lifetimePoints: number): 'SILVER' | 'GOLD' | 'PLATINUM' {
  if (lifetimePoints >= 15000) return 'PLATINUM';
  if (lifetimePoints >= 5000) return 'GOLD';
  return 'SILVER';
}

@Injectable()
export class LoyaltyService {
  constructor(private readonly prisma: PrismaService) {}

  private async ensureAccount(clientId: string) {
    const client = await this.prisma.client.findUnique({ where: { id: clientId } });
    if (!client) throw new NotFoundException('Client not found');
    return this.prisma.loyaltyAccount.upsert({
      where: { clientId },
      create: { clientId },
      update: {},
    });
  }

  async findByClient(clientId: string) {
    const account = await this.ensureAccount(clientId);
    const transactions = await this.prisma.loyaltyTransaction.findMany({
      where: { accountId: account.id },
      orderBy: { createdAt: 'desc' },
    });
    return { ...account, tier: tierForLifetimePoints(account.lifetimePoints), transactions };
  }

  async earn(clientId: string, dto: PointsAdjustmentDto, createdBy: string) {
    const account = await this.ensureAccount(clientId);
    await this.prisma.loyaltyTransaction.create({
      data: { accountId: account.id, type: 'EARNED', points: dto.points, bookingId: dto.bookingId, description: dto.description, createdBy },
    });
    return this.prisma.loyaltyAccount.update({
      where: { id: account.id },
      data: { points: { increment: dto.points }, lifetimePoints: { increment: dto.points } },
    });
  }

  async redeem(clientId: string, dto: PointsAdjustmentDto, createdBy: string) {
    const account = await this.ensureAccount(clientId);
    if (account.points < dto.points) {
      throw new BadRequestException(`This client only has ${account.points} points available`);
    }
    await this.prisma.loyaltyTransaction.create({
      data: { accountId: account.id, type: 'REDEEMED', points: -dto.points, description: dto.description, createdBy },
    });
    return this.prisma.loyaltyAccount.update({
      where: { id: account.id },
      data: { points: { decrement: dto.points } },
    });
  }

  async referralBonus(clientId: string, dto: PointsAdjustmentDto, createdBy: string) {
    const account = await this.ensureAccount(clientId);
    await this.prisma.loyaltyTransaction.create({
      data: { accountId: account.id, type: 'REFERRAL_BONUS', points: dto.points, description: dto.description, createdBy },
    });
    return this.prisma.loyaltyAccount.update({
      where: { id: account.id },
      data: { points: { increment: dto.points }, lifetimePoints: { increment: dto.points } },
    });
  }
}
