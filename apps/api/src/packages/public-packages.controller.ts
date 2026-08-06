import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { PackagesService } from './packages.service';
import { RateLimitGuard } from '../common/guards/rate-limit.guard';

/**
 * No-auth read surface feeding the public marketing pages under
 * apps/web/src/app/holidays — any package an Admin/Director creates or
 * edits via the CRM's /packages screen shows up here immediately (same
 * Postgres row, no separate sync step). Only active packages, and only
 * customer-facing fields — never RateCard cost internals.
 */
@UseGuards(RateLimitGuard)
@Controller('public/packages')
export class PublicPackagesController {
  constructor(private readonly packagesService: PackagesService) {}

  @Get()
  findAll() {
    return this.packagesService.publicList();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.packagesService.publicFindOne(id);
  }
}
