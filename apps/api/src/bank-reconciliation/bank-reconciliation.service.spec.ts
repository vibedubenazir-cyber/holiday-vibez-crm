import { BadRequestException } from '@nestjs/common';
import { PaymentType, Role } from '@prisma/client';
import { BankReconciliationService } from './bank-reconciliation.service';
import { PrismaService } from '../prisma.service';

// BUG 4 — match() checked only that the transaction and payment existed and
// were unmatched. Any payment could be reconciled against any transaction:
// an inbound client receipt against an outbound vendor payment, ₹500 against
// ₹500,000. The books balanced on paper while being materially wrong.

const ACTOR = { role: Role.ADMIN, branchId: null };

describe('BankReconciliationService.match() — direction and amount', () => {
  let service: BankReconciliationService;
  let prisma: {
    bankTransaction: { findUnique: jest.Mock; update: jest.Mock };
    payment: { findUnique: jest.Mock };
  };

  beforeEach(() => {
    prisma = {
      bankTransaction: {
        findUnique: jest.fn(),
        update: jest.fn().mockResolvedValue({}),
      },
      payment: { findUnique: jest.fn() },
    };
    service = new BankReconciliationService(prisma as unknown as PrismaService);
  });

  // findUnique is called twice in match(): once for the txn, once for the
  // "already matched to another transaction" check.
  const givenTxn = (txn: Record<string, unknown>) =>
    prisma.bankTransaction.findUnique.mockResolvedValueOnce(txn).mockResolvedValueOnce(null);

  it('rejects a CREDIT matched to an outbound DMC_PAYABLE', async () => {
    givenTxn({ id: 'txn-1', type: 'CREDIT', amount: 50000, matched: false, branchId: 'b1' });
    prisma.payment.findUnique.mockResolvedValue({
      id: 'pay-1', type: PaymentType.DMC_PAYABLE, amount: 50000,
    });

    await expect(service.match('txn-1', 'pay-1', ACTOR)).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.bankTransaction.update).not.toHaveBeenCalled();
  });

  it('rejects a DEBIT matched to an inbound CLIENT_RECEIPT', async () => {
    givenTxn({ id: 'txn-2', type: 'DEBIT', amount: 50000, matched: false, branchId: 'b1' });
    prisma.payment.findUnique.mockResolvedValue({
      id: 'pay-2', type: PaymentType.CLIENT_RECEIPT, amount: 50000,
    });

    await expect(service.match('txn-2', 'pay-2', ACTOR)).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.bankTransaction.update).not.toHaveBeenCalled();
  });

  it('rejects a right-direction payment for the wrong amount', async () => {
    givenTxn({ id: 'txn-3', type: 'CREDIT', amount: 50000, matched: false, branchId: 'b1' });
    prisma.payment.findUnique.mockResolvedValue({
      id: 'pay-3', type: PaymentType.CLIENT_RECEIPT, amount: 500,
    });

    await expect(service.match('txn-3', 'pay-3', ACTOR)).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.bankTransaction.update).not.toHaveBeenCalled();
  });

  it('matches a CREDIT to a CLIENT_RECEIPT of the same amount', async () => {
    givenTxn({ id: 'txn-4', type: 'CREDIT', amount: 50000, matched: false, branchId: 'b1' });
    prisma.payment.findUnique.mockResolvedValue({
      id: 'pay-4', type: PaymentType.CLIENT_RECEIPT, amount: 50000,
    });

    await service.match('txn-4', 'pay-4', ACTOR);

    expect(prisma.bankTransaction.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { matched: true, matchedPaymentId: 'pay-4' } }),
    );
  });

  it('tolerates sub-paisa float drift', async () => {
    // Decimal columns arrive as JS numbers; a hard === would reject legitimate
    // matches over rounding noise and push staff back to manual overrides.
    givenTxn({ id: 'txn-5', type: 'DEBIT', amount: 1000.004, matched: false, branchId: 'b1' });
    prisma.payment.findUnique.mockResolvedValue({
      id: 'pay-5', type: PaymentType.DMC_PAYABLE, amount: 1000,
    });

    await service.match('txn-5', 'pay-5', ACTOR);

    expect(prisma.bankTransaction.update).toHaveBeenCalled();
  });
});
