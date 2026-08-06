import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { ReviewStatusDto } from './dto/review-status.dto';

@Injectable()
export class ReviewsService {
  constructor(private readonly prisma: PrismaService) {}

  async findForBooking(bookingId: string) {
    return this.prisma.review.findMany({ where: { bookingId }, orderBy: { createdAt: 'desc' } });
  }

  async create(bookingId: string, dto: CreateReviewDto, createdBy: string) {
    const booking = await this.prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking) throw new NotFoundException('Booking not found');
    return this.prisma.review.create({
      data: { bookingId, rating: dto.rating, comment: dto.comment, createdBy },
    });
  }

  async updateStatus(id: string, dto: ReviewStatusDto) {
    const review = await this.prisma.review.findUnique({ where: { id } });
    if (!review) throw new NotFoundException('Review not found');
    return this.prisma.review.update({ where: { id }, data: { status: dto.status } });
  }

  async findApprovedForDestination(destination: string) {
    return this.prisma.review.findMany({
      where: {
        status: 'APPROVED',
        booking: { quotation: { lead: { destination: { equals: destination, mode: 'insensitive' } } } },
      },
      include: { booking: { include: { quotation: { include: { lead: true } } } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findPending() {
    return this.prisma.review.findMany({
      where: { status: 'PENDING' },
      include: { booking: { include: { quotation: { include: { lead: true } } } } },
      orderBy: { createdAt: 'asc' },
    });
  }
}
