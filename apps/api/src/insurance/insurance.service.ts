import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreatePolicyDto } from './dto/create-policy.dto';
import { UpdatePolicyStatusDto } from './dto/update-policy-status.dto';

@Injectable()
export class InsuranceService {
  constructor(private readonly prisma: PrismaService) {}

  async findForBooking(bookingId: string) {
    return this.prisma.insurancePolicy.findMany({ where: { bookingId }, orderBy: { createdAt: 'desc' } });
  }

  async create(bookingId: string, dto: CreatePolicyDto, createdBy: string) {
    const booking = await this.prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking) throw new NotFoundException('Booking not found');
    return this.prisma.insurancePolicy.create({
      data: {
        bookingId,
        provider: dto.provider,
        policyNumber: dto.policyNumber,
        premiumAmount: dto.premiumAmount,
        coverageAmount: dto.coverageAmount,
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
        createdBy,
      },
    });
  }

  async updateStatus(id: string, dto: UpdatePolicyStatusDto) {
    const policy = await this.prisma.insurancePolicy.findUnique({ where: { id } });
    if (!policy) throw new NotFoundException('Policy not found');
    return this.prisma.insurancePolicy.update({
      where: { id },
      data: { status: dto.status, claimNotes: dto.claimNotes ?? policy.claimNotes },
    });
  }
}
