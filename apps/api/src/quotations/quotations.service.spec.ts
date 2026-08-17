import { BadRequestException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { QuotationsService } from './quotations.service';
import { PrismaService } from '../prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

// BUG 3 — Quotation.currency is always INR, but addItem() snapshotted a rate
// card's amount without converting from the card's own currency. A USD card
// was summed and shown to the customer as INR: an ~83x undercharge on every
// non-INR line, silently, with no error anywhere.

const ACTOR = { role: Role.ADMIN, id: 'admin-1', branchId: null };

describe('QuotationsService.addItem() — rate card currency conversion', () => {
  let service: QuotationsService;
  let prisma: {
    quotation: { findUnique: jest.Mock; update: jest.Mock };
    rateCard: { findUnique: jest.Mock };
    currencyRate: { findUnique: jest.Mock };
    quotationItem: { create: jest.Mock; findMany: jest.Mock };
  };

  beforeEach(() => {
    prisma = {
      quotation: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'quote-1',
          status: 'DRAFT',
          currency: 'INR',
          consultantId: 'admin-1',
          lead: { branchId: 'branch-1' },
        }),
        update: jest.fn().mockResolvedValue({}),
      },
      rateCard: { findUnique: jest.fn() },
      currencyRate: { findUnique: jest.fn() },
      quotationItem: { create: jest.fn().mockResolvedValue({}), findMany: jest.fn().mockResolvedValue([]) },
    };
    service = new QuotationsService(
      prisma as unknown as PrismaService,
      { send: jest.fn() } as unknown as NotificationsService,
    );
  });

  const snapshotAmount = () => prisma.quotationItem.create.mock.calls[0][0].data.snapshotAmount;

  it('converts a USD rate card to INR before snapshotting', async () => {
    prisma.rateCard.findUnique.mockResolvedValue({
      id: 'rc-1', name: 'Dubai Hotel', destination: 'Dubai',
      baseCost: 100, taxPct: 0, currency: 'USD', active: true,
    });
    prisma.currencyRate.findUnique.mockResolvedValue({ code: 'USD', rateToInr: 83.5 });

    await service.addItem('quote-1', { rateCardId: 'rc-1' } as never, ACTOR);

    // 100 USD x 83.5 = 8350 INR. The bug stored a bare 100.
    expect(snapshotAmount()).toBe(8350);
    expect(snapshotAmount()).not.toBe(100);
  });

  it('applies tax before conversion', async () => {
    prisma.rateCard.findUnique.mockResolvedValue({
      id: 'rc-2', name: 'Dubai Transfer', destination: 'Dubai',
      baseCost: 100, taxPct: 10, currency: 'USD', active: true,
    });
    prisma.currencyRate.findUnique.mockResolvedValue({ code: 'USD', rateToInr: 80 });

    await service.addItem('quote-1', { rateCardId: 'rc-2' } as never, ACTOR);

    expect(snapshotAmount()).toBe(8800); // 100 * 1.10 * 80
  });

  it('leaves an INR rate card untouched and skips the FX lookup', async () => {
    prisma.rateCard.findUnique.mockResolvedValue({
      id: 'rc-3', name: 'Goa Hotel', destination: 'Goa',
      baseCost: 5000, taxPct: 0, currency: 'INR', active: true,
    });

    await service.addItem('quote-1', { rateCardId: 'rc-3' } as never, ACTOR);

    expect(snapshotAmount()).toBe(5000);
    expect(prisma.currencyRate.findUnique).not.toHaveBeenCalled();
  });

  it('refuses the item when no exchange rate is configured', async () => {
    prisma.rateCard.findUnique.mockResolvedValue({
      id: 'rc-4', name: 'Tokyo Hotel', destination: 'Tokyo',
      baseCost: 20000, taxPct: 0, currency: 'JPY', active: true,
    });
    prisma.currencyRate.findUnique.mockResolvedValue(null);

    // Failing loudly is the point: silently treating 20000 JPY as 20000 INR
    // is exactly the original bug.
    await expect(
      service.addItem('quote-1', { rateCardId: 'rc-4' } as never, ACTOR),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.quotationItem.create).not.toHaveBeenCalled();
  });
});
