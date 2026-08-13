import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ReimbursementStatus } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { CreateReimbursementClaimDto } from './dto/reimbursement-claim.dto';

@Injectable()
export class ReimbursementsService {
  constructor(private readonly prisma: PrismaService) {}

  create(userId: string, dto: CreateReimbursementClaimDto) {
    return this.prisma.reimbursementClaim.create({
      data: {
        userId,
        category: dto.category,
        description: dto.description,
        amount: dto.amount,
        expenseDate: new Date(dto.expenseDate),
        receiptUrl: dto.receiptUrl,
      },
    });
  }

  findMine(userId: string) {
    return this.prisma.reimbursementClaim.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } });
  }

  findAll(filter: { branchId?: string; status?: ReimbursementStatus }) {
    return this.prisma.reimbursementClaim.findMany({
      where: {
        status: filter.status,
        user: filter.branchId ? { branchId: filter.branchId } : undefined,
      },
      include: { user: { select: { name: true, branchId: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async review(id: string, status: 'APPROVED' | 'REJECTED', reviewerId: string, comment: string | undefined) {
    const claim = await this.prisma.reimbursementClaim.findUnique({ where: { id } });
    if (!claim) throw new NotFoundException('Reimbursement claim not found');
    if (claim.status !== 'PENDING') throw new BadRequestException('This claim has already been reviewed');
    if (claim.userId === reviewerId) {
      throw new ForbiddenException('You cannot approve or reject a claim you submitted yourself');
    }
    return this.prisma.reimbursementClaim.update({
      where: { id },
      data: { status, reviewedById: reviewerId, reviewedAt: new Date(), reviewComment: comment },
    });
  }

  async markPaid(id: string) {
    const claim = await this.prisma.reimbursementClaim.findUnique({ where: { id } });
    if (!claim) throw new NotFoundException('Reimbursement claim not found');
    if (claim.status !== 'APPROVED') throw new BadRequestException('Only an approved claim can be marked paid');
    return this.prisma.reimbursementClaim.update({ where: { id }, data: { status: 'PAID', paidAt: new Date() } });
  }
}
