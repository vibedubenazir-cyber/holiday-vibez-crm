import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateFeedbackDto } from './dto/create-feedback.dto';

@Injectable()
export class FeedbackService {
  constructor(private readonly prisma: PrismaService) {}

  async findForBooking(bookingId: string) {
    return this.prisma.tripFeedback.findMany({ where: { bookingId }, orderBy: { createdAt: 'desc' } });
  }

  async create(bookingId: string, dto: CreateFeedbackDto, createdBy: string) {
    const booking = await this.prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking) throw new NotFoundException('Booking not found');
    return this.prisma.tripFeedback.create({
      data: {
        bookingId,
        overallSatisfaction: dto.overallSatisfaction,
        hotelRating: dto.hotelRating,
        transportRating: dto.transportRating,
        guideRating: dto.guideRating,
        comments: dto.comments,
        createdBy,
      },
    });
  }

  async summary() {
    const rows = await this.prisma.tripFeedback.findMany();
    if (rows.length === 0) {
      return { count: 0, avgOverallSatisfaction: 0, avgHotelRating: 0, avgTransportRating: 0, avgGuideRating: 0 };
    }
    const avg = (values: number[]) => (values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0);
    return {
      count: rows.length,
      avgOverallSatisfaction: avg(rows.map((r) => r.overallSatisfaction)),
      avgHotelRating: avg(rows.filter((r) => r.hotelRating != null).map((r) => r.hotelRating as number)),
      avgTransportRating: avg(rows.filter((r) => r.transportRating != null).map((r) => r.transportRating as number)),
      avgGuideRating: avg(rows.filter((r) => r.guideRating != null).map((r) => r.guideRating as number)),
    };
  }
}
