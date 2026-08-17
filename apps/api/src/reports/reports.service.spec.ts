import { Role } from '@prisma/client';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';
import { PrismaService } from '../prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

// BUGS 7 & 9 — two branch-scoping omissions in Reports.
//
//  #7 complianceExpiring() took no branchId at all, so a Branch Manager saw
//     passport and visa data for every traveler in the company.
//  #9 accountsDashboard() scoped every query except pending DMC commissions,
//     which stayed org-wide on an otherwise branch-scoped dashboard.

const BRANCH = 'branch-1';

describe('ReportsService — branch scoping', () => {
  let service: ReportsService;
  let prisma: Record<string, { findMany: jest.Mock; count?: jest.Mock }>;

  beforeEach(() => {
    const findMany = () => jest.fn().mockResolvedValue([]);
    prisma = {
      traveler: { findMany: findMany() },
      dmcCommission: { findMany: findMany() },
      pettyCashEntry: { findMany: findMany() },
      budget: { findMany: findMany() },
      bankTransaction: { findMany: findMany(), count: jest.fn().mockResolvedValue(0) },
      payment: { findMany: findMany() },
      invoice: { findMany: findMany() },
      expense: { findMany: findMany() },
    };
    service = new ReportsService(
      prisma as unknown as PrismaService,
      { send: jest.fn() } as unknown as NotificationsService,
    );
  });

  // BUG 7
  describe('complianceExpiring()', () => {
    it('filters travelers by branch when one is given', async () => {
      await service.complianceExpiring(BRANCH);

      expect(prisma.traveler.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { lead: { branchId: BRANCH } } }),
      );
    });

    it('stays org-wide when called with no branch (the nightly cron)', async () => {
      await service.complianceExpiring();

      expect(prisma.traveler.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: undefined }),
      );
    });
  });

  // BUG 9
  describe('accountsDashboard()', () => {
    it('scopes pending DMC commissions through booking→quotation→lead', async () => {
      await service.accountsDashboard(BRANCH);

      expect(prisma.dmcCommission.findMany).toHaveBeenCalledWith({
        where: {
          status: 'PENDING',
          booking: { quotation: { lead: { branchId: BRANCH } } },
        },
      });
    });

    it('leaves commissions org-wide for Director/Admin (no branch)', async () => {
      await service.accountsDashboard(undefined);

      expect(prisma.dmcCommission.findMany).toHaveBeenCalledWith({
        where: { status: 'PENDING' },
      });
    });
  });
});

// The service can only scope by what the controller hands it. The original
// defect was partly at this seam: the controller never passed a branch at all.
describe('ReportsController — forces Branch Managers to their own branch', () => {
  it('passes the actor branch into complianceExpiring()', () => {
    const reports = { complianceExpiring: jest.fn() };
    const controller = new ReportsController(reports as unknown as ReportsService);

    controller.complianceExpiring({ role: Role.BRANCH_MANAGER, branchId: BRANCH });

    expect(reports.complianceExpiring).toHaveBeenCalledWith(BRANCH);
  });

  it('lets a Director see org-wide', () => {
    const reports = { complianceExpiring: jest.fn() };
    const controller = new ReportsController(reports as unknown as ReportsService);

    controller.complianceExpiring({ role: Role.DIRECTOR, branchId: null });

    expect(reports.complianceExpiring).toHaveBeenCalledWith(undefined);
  });
});
