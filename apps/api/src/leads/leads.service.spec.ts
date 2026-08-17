import { ConflictException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { LeadsService } from './leads.service';
import { PrismaService } from '../prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

// BUG 10 — the duplicate-phone ConflictException echoed the existing lead's
// client name, destination and pipeline status. A Branch Manager who happened
// to key in a number belonging to another branch was handed that branch's
// customer record — the same data assertScope() blocks everywhere else.
//
// The lead id stays visible in both variants deliberately: support needs
// something to reference when a consultant reports "it says duplicate".

const PHONE = '+919812345678';

const DUPLICATE = {
  id: 'lead-existing',
  phone: PHONE,
  clientName: 'Priya Sharma',
  destination: 'Maldives',
  status: 'HOT_LEAD',
  branchId: 'branch-OTHER',
};

describe('LeadsService.create() — duplicate message redaction', () => {
  let service: LeadsService;
  let prisma: {
    lead: { findMany: jest.Mock; create: jest.Mock };
    $transaction: jest.Mock;
  };

  beforeEach(() => {
    prisma = {
      lead: {
        // findDuplicateByPhone() pulls candidates and matches on the last 10
        // digits in JS, so the mock returns rows rather than a pre-filtered hit.
        findMany: jest.fn().mockResolvedValue([DUPLICATE]),
        create: jest.fn(),
      },
      // Run the callback inline against the same mock: these tests care about
      // the message the guard produces, not the isolation level it runs under.
      $transaction: jest.fn().mockImplementation((fn) => fn(prisma)),
    };
    service = new LeadsService(
      prisma as unknown as PrismaService,
      { send: jest.fn() } as unknown as NotificationsService,
    );
  });

  const attempt = (actor: { id: string; role: Role; branchId: string | null }) =>
    service.create(
      { clientName: 'New Person', phone: PHONE, destination: 'Goa', branchId: 'branch-1' } as never,
      actor,
    );

  const messageFrom = async (actor: { id: string; role: Role; branchId: string | null }) => {
    try {
      await attempt(actor);
      throw new Error('expected a ConflictException');
    } catch (err) {
      expect(err).toBeInstanceOf(ConflictException);
      return (err as ConflictException).message;
    }
  };

  it('redacts the other branch\'s customer details from a Branch Manager', async () => {
    const message = await messageFrom({ id: 'bm-1', role: Role.BRANCH_MANAGER, branchId: 'branch-1' });

    expect(message).not.toContain('Priya Sharma');
    expect(message).not.toContain('Maldives');
    expect(message).not.toContain('HOT_LEAD');
    expect(message).toContain('another branch');
    expect(message).toContain(DUPLICATE.id);
  });

  it('shows full details when the duplicate is in the manager\'s own branch', async () => {
    prisma.lead.findMany.mockResolvedValue([{ ...DUPLICATE, branchId: 'branch-1' }]);

    const message = await messageFrom({ id: 'bm-1', role: Role.BRANCH_MANAGER, branchId: 'branch-1' });

    expect(message).toContain('Priya Sharma');
    expect(message).toContain('Maldives');
  });

  it('shows full details to a Director, who is not branch-limited', async () => {
    const message = await messageFrom({ id: 'dir-1', role: Role.DIRECTOR, branchId: null });

    expect(message).toContain('Priya Sharma');
    expect(message).toContain('Maldives');
  });

  it('does not create a lead when a duplicate is found', async () => {
    await expect(
      attempt({ id: 'bm-1', role: Role.BRANCH_MANAGER, branchId: 'branch-1' }),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(prisma.lead.create).not.toHaveBeenCalled();
  });
});
