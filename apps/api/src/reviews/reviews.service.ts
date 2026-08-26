import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { ReviewStatusDto } from './dto/review-status.dto';

// Show only the reviewer's given name publicly — never the full customer name.
function firstNameOnly(name: string | null | undefined): string {
  return (name?.trim().split(/\s+/)[0]) || 'Traveller';
}

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

  // Public, unauthenticated. Requires an explicit destination (an empty query
  // must NOT dump every approved review), and returns only what a marketing
  // testimonial needs — never the customer's full Lead row. The reviewer is
  // shown by first name only, so this can't be used to harvest customer PII.
  async findApprovedForDestination(destination: string) {
    if (!destination || !destination.trim()) return [];
    const reviews = await this.prisma.review.findMany({
      where: {
        status: 'APPROVED',
        booking: { quotation: { lead: { destination: { equals: destination, mode: 'insensitive' } } } },
      },
      select: {
        id: true,
        rating: true,
        comment: true,
        createdAt: true,
        booking: { select: { quotation: { select: { lead: { select: { clientName: true } } } } } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return reviews.map((r) => ({
      id: r.id,
      rating: r.rating,
      comment: r.comment,
      createdAt: r.createdAt,
      reviewerName: firstNameOnly(r.booking?.quotation?.lead?.clientName),
    }));
  }

  async findPending() {
    return this.prisma.review.findMany({
      where: { status: 'PENDING' },
      include: { booking: { include: { quotation: { include: { lead: true } } } } },
      orderBy: { createdAt: 'asc' },
    });
  }
}
