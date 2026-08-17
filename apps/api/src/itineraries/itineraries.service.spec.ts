import { NotFoundException } from '@nestjs/common';
import { ItinerariesService } from './itineraries.service';
import { PrismaService } from '../prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

// BUG 8 — publicView() feeds the unauthenticated client-facing report at
// /itinerary/:id/final. `details` is a freeform Json column, so whatever a
// consultant happened to store there — internal cost notes, supplier margins,
// scratch text — was published verbatim to anyone holding the link.
//
// The fix is an allow-list: only keys the report template actually renders
// survive. These tests pin that it is an allow-list (unknown keys dropped)
// rather than a deny-list (which silently fails open on any new key).

function planWith(details: Record<string, unknown>) {
  return {
    id: 'plan-1',
    refNo: '100001',
    title: 'Test Package',
    status: 'READY_TO_SHARE',
    destinations: ['Goa'],
    startDate: null, endDate: null,
    adultsCount: 2, childrenCount: 0, infantsCount: 0,
    coverPhotoUrl: null, createdAt: new Date(),
    days: [{
      id: 'day-1', dayNumber: 1, date: null,
      events: [{
        id: 'ev-1', type: 'ACCOMMODATION', name: 'Beach Resort',
        destination: 'Goa', date: null, endDate: null,
        startTime: null, endTime: null, showTime: true,
        description: null, photoUrl: null,
        netAmount: 50000, markupPct: 20,
        details,
      }],
    }],
    images: [], packageTerms: null, pricingOptions: [],
  };
}

describe('ItinerariesService.publicView() — public detail allow-list', () => {
  let service: ItinerariesService;
  let prisma: { itineraryPlan: { findUnique: jest.Mock } };

  beforeEach(() => {
    prisma = { itineraryPlan: { findUnique: jest.fn() } };
    service = new ItinerariesService(
      prisma as unknown as PrismaService,
      { send: jest.fn() } as unknown as NotificationsService,
    );
  });

  const publishedEventDetails = async (details: Record<string, unknown>) => {
    prisma.itineraryPlan.findUnique.mockResolvedValue(planWith(details));
    const view = await service.publicView('plan-1');
    return view.days[0].events[0].details as Record<string, unknown> | undefined;
  };

  it('drops keys that are not on the allow-list', async () => {
    const out = await publishedEventDetails({
      roomName: 'Sea View Suite',
      internalNote: 'supplier gives us 30% back, quote high',
      supplierCost: 21000,
      agentMargin: 0.42,
    });

    expect(out).toEqual({ roomName: 'Sea View Suite' });
    expect(out).not.toHaveProperty('internalNote');
    expect(out).not.toHaveProperty('supplierCost');
    expect(out).not.toHaveProperty('agentMargin');
  });

  it('keeps the guest-facing fields the report renders', async () => {
    const out = await publishedEventDetails({
      hotelCategory: 5,
      roomName: 'Deluxe',
      mealPlan: 'Breakfast Included',
      checkInTime: '14:00',
      checkOutTime: '11:00',
    });

    expect(out).toEqual({
      hotelCategory: 5,
      roomName: 'Deluxe',
      mealPlan: 'Breakfast Included',
      checkInTime: '14:00',
      checkOutTime: '11:00',
    });
  });

  it('returns undefined when nothing survives the filter', async () => {
    expect(await publishedEventDetails({ secretMargin: 999 })).toBeUndefined();
  });

  it('never exposes per-line cost or markup on the public payload', async () => {
    prisma.itineraryPlan.findUnique.mockResolvedValue(planWith({ roomName: 'Deluxe' }));

    const view = await service.publicView('plan-1');
    const event = view.days[0].events[0] as Record<string, unknown>;

    expect(event).not.toHaveProperty('netAmount');
    expect(event).not.toHaveProperty('markupPct');
  });

  it('404s for an unpublished draft rather than leaking it', async () => {
    prisma.itineraryPlan.findUnique.mockResolvedValue({
      ...planWith({}), status: 'DRAFT',
    });

    await expect(service.publicView('plan-1')).rejects.toBeInstanceOf(NotFoundException);
  });
});
