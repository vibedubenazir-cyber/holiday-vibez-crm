import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { CreatePerformanceReviewDto, UpdatePerformanceReviewDto } from './dto/performance-review.dto';

type ActingUser = { id: string; role: Role; branchId: string | null };

@Injectable()
export class PerformanceService {
  constructor(private readonly prisma: PrismaService) {}

  async create(reviewerId: string, actingUser: ActingUser, dto: CreatePerformanceReviewDto) {
    if (dto.userId === reviewerId) throw new ForbiddenException('You cannot review yourself');
    const reviewee = await this.prisma.user.findUnique({ where: { id: dto.userId } });
    if (!reviewee) throw new NotFoundException('Employee not found');
    if (actingUser.role === Role.BRANCH_MANAGER && reviewee.branchId !== actingUser.branchId) {
      throw new ForbiddenException('You can only review employees in your own branch');
    }

    const existing = await this.prisma.performanceReview.findUnique({
      where: { userId_period: { userId: dto.userId, period: dto.period } },
    });
    if (existing) throw new BadRequestException(`A review already exists for this employee for ${dto.period}`);

    return this.prisma.performanceReview.create({
      data: {
        userId: dto.userId,
        reviewerId,
        period: dto.period,
        rating: dto.rating,
        strengths: dto.strengths,
        improvements: dto.improvements,
        goals: dto.goals,
      },
    });
  }

  async update(id: string, reviewerId: string, dto: UpdatePerformanceReviewDto) {
    await this.requireDraftOwnedBy(id, reviewerId);
    return this.prisma.performanceReview.update({
      where: { id },
      data: { rating: dto.rating, strengths: dto.strengths, improvements: dto.improvements, goals: dto.goals },
    });
  }

  async submit(id: string, reviewerId: string) {
    await this.requireDraftOwnedBy(id, reviewerId);
    return this.prisma.performanceReview.update({ where: { id }, data: { status: 'SUBMITTED' } });
  }

  private async requireDraftOwnedBy(id: string, reviewerId: string) {
    const review = await this.prisma.performanceReview.findUnique({ where: { id } });
    if (!review) throw new NotFoundException('Review not found');
    if (review.reviewerId !== reviewerId) throw new ForbiddenException('Only the reviewer can edit this review');
    if (review.status !== 'DRAFT') throw new BadRequestException('Only a draft review can be edited');
    return review;
  }

  async acknowledge(id: string, userId: string) {
    const review = await this.prisma.performanceReview.findUnique({ where: { id } });
    if (!review) throw new NotFoundException('Review not found');
    if (review.userId !== userId) throw new ForbiddenException('You can only acknowledge your own review');
    if (review.status !== 'SUBMITTED') throw new BadRequestException('Only a submitted review can be acknowledged');
    return this.prisma.performanceReview.update({ where: { id }, data: { status: 'ACKNOWLEDGED' } });
  }

  // Drafts are the reviewer's working notes — a reviewee only sees a review
  // once it's been submitted.
  findMine(userId: string) {
    return this.prisma.performanceReview.findMany({
      where: { userId, status: { in: ['SUBMITTED', 'ACKNOWLEDGED'] } },
      include: { reviewer: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  findGiven(reviewerId: string) {
    return this.prisma.performanceReview.findMany({
      where: { reviewerId },
      include: { user: { select: { name: true, branchId: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  findAll(filter: { branchId?: string }) {
    return this.prisma.performanceReview.findMany({
      where: { user: filter.branchId ? { branchId: filter.branchId } : undefined },
      include: { user: { select: { name: true, branchId: true } }, reviewer: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }
}
