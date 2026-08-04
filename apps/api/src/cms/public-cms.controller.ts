import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { CmsContentType } from '@prisma/client';
import { CmsService } from './cms.service';
import { RateLimitGuard } from '../common/guards/rate-limit.guard';

/**
 * No-auth read surface for the CMS content this repo doesn't render itself — the
 * real public site (www.holidayvibez.com, spec Section 10) would consume this the
 * same way it posts to /public/leads. Read-only, only ever returns active/published
 * rows, so no API-key check the way the write-capable /public/leads endpoint needs —
 * still rate-limited against scraping/abuse.
 */
@UseGuards(RateLimitGuard)
@Controller('public/cms')
export class PublicCmsController {
  constructor(private readonly cmsService: CmsService) {}

  @Get('content')
  findContent(@Query('type') type?: CmsContentType) {
    return this.cmsService.findPublicContent(type);
  }

  @Get('settings')
  findSettings() {
    return this.cmsService.findAllSettings();
  }
}
