import { Controller, Get, Param, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { ItinerariesService } from './itineraries.service';
import { RateLimitGuard } from '../common/guards/rate-limit.guard';
import { streamItineraryPdf } from './itinerary-pdf.util';

// Unauthenticated — the client opening a shared itinerary link has no
// account. ItinerariesService.publicView() only returns READY_TO_SHARE
// itineraries and strips internal cost fields, so a leaked draft link
// exposes nothing. Rate-limited against scripted enumeration of ids,
// matching every other public controller (quotations, vouchers, invoices).
// The marketing site's Packages listing — cards only, curated in
// publicWebsitePackages() (Show on Website + published + within validity).
@UseGuards(RateLimitGuard)
@Controller('public/website-packages')
export class PublicWebsitePackagesController {
  constructor(private readonly itinerariesService: ItinerariesService) {}

  @Get()
  list() {
    return this.itinerariesService.publicWebsitePackages();
  }
}

@UseGuards(RateLimitGuard)
@Controller('public/itineraries')
export class PublicItineraryController {
  constructor(private readonly itinerariesService: ItinerariesService) {}

  @Get(':id')
  view(@Param('id') id: string) {
    return this.itinerariesService.publicView(id);
  }

  @Get(':id/pdf')
  async pdf(@Param('id') id: string, @Res() res: Response) {
    const plan = await this.itinerariesService.publicView(id);
    await streamItineraryPdf(res, plan);
  }
}
