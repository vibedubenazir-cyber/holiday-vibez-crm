import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PaymentType, Role } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { CreateBankTransactionDto } from './dto/bank-transaction.dto';

// A bank CREDIT is money coming in — only a CLIENT_RECEIPT payment can back
// it. A DEBIT is money going out — only DMC_PAYABLE/COMMISSION/REFUND can.
// Matching across this line lets an inbound receipt reconcile against an
// unrelated outbound vendor payment.
const CREDIT_PAYMENT_TYPES: PaymentType[] = [PaymentType.CLIENT_RECEIPT];
const DEBIT_PAYMENT_TYPES: PaymentType[] = [PaymentType.DMC_PAYABLE, PaymentType.COMMISSION, PaymentType.REFUND];
const AMOUNT_TOLERANCE = 0.01;

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

    const payment = await this.prisma.payment.findUnique({ where: { id: paymentId } });
    if (!payment) throw new NotFoundException('Payment not found');

    const allowedTypes = txn.type === 'CREDIT' ? CREDIT_PAYMENT_TYPES : DEBIT_PAYMENT_TYPES;
    if (!allowedTypes.includes(payment.type)) {
      throw new BadRequestException(
        `A ${txn.type} bank transaction cannot be matched to a ${payment.type} payment — direction mismatch`,
      );
    }
    if (Math.abs(Number(txn.amount) - Number(payment.amount)) > AMOUNT_TOLERANCE) {
      throw new BadRequestException(
        `Amount mismatch: bank transaction is ${txn.amount}, payment is ${payment.amount}`,
      );
    }

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
