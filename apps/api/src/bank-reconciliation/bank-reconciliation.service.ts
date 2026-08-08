import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { CreateBankTransactionDto } from './dto/bank-transaction.dto';

@Injectable()
export class BankReconciliationService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(filter: { branchId?: string }) {
    return this.prisma.bankTransaction.findMany({
      where: { branchId: filter.branchId },
      include: { matchedPayment: true },
      orderBy: { transactionDate: 'desc' },
    });
  }

  create(dto: CreateBankTransactionDto, branchId: string | undefined, createdBy: string) {
    return this.prisma.bankTransaction.create({
      data: {
        branchId,
        transactionDate: new Date(dto.transactionDate),
        description: dto.description,
        amount: dto.amount,
        type: dto.type,
        createdBy,
      },
    });
  }

  async match(id: string, paymentId: string, actor: { role: Role; branchId: string | null }) {
    const txn = await this.prisma.bankTransaction.findUnique({ where: { id } });
    if (!txn) throw new NotFoundException('Bank transaction not found');
    this.assertBranchScope(actor, txn.branchId);
    if (txn.matched) throw new BadRequestException('This transaction is already matched');

    const alreadyMatched = await this.prisma.bankTransaction.findUnique({ where: { matchedPaymentId: paymentId } });
    if (alreadyMatched) throw new BadRequestException('That payment is already matched to another transaction');

    return this.prisma.bankTransaction.update({
      where: { id },
      data: { matched: true, matchedPaymentId: paymentId },
      include: { matchedPayment: true },
    });
  }

  async unmatch(id: string, actor: { role: Role; branchId: string | null }) {
    const txn = await this.prisma.bankTransaction.findUnique({ where: { id } });
    if (!txn) throw new NotFoundException('Bank transaction not found');
    this.assertBranchScope(actor, txn.branchId);
    return this.prisma.bankTransaction.update({ where: { id }, data: { matched: false, matchedPaymentId: null } });
  }

  private assertBranchScope(actor: { role: Role; branchId: string | null }, txnBranchId: string | null) {
    if (actor.role === Role.BRANCH_MANAGER && actor.branchId !== txnBranchId) {
      throw new ForbiddenException("You can only act on your own branch's bank transactions");
    }
  }
}
