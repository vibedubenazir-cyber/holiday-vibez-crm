import { Injectable, NotFoundException } from '@nestjs/common';
import { CmsContentType } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { CreateCmsContentDto, UpdateCmsContentDto, UpsertSiteSettingDto } from './dto/cms.dto';

@Injectable()
export class CmsService {
  constructor(private readonly prisma: PrismaService) {}

  findAllContent(type?: CmsContentType) {
    return this.prisma.cmsContent.findMany({
      where: { type },
      orderBy: [{ type: 'asc' }, { sortOrder: 'asc' }],
    });
  }

  findPublicContent(type?: CmsContentType) {
    return this.prisma.cmsContent.findMany({
      where: { type, active: true },
      orderBy: [{ type: 'asc' }, { sortOrder: 'asc' }],
    });
  }

  createContent(dto: CreateCmsContentDto, createdBy: string) {
    return this.prisma.cmsContent.create({
      data: { ...dto, createdBy, publishedAt: new Date() },
    });
  }

  async updateContent(id: string, dto: UpdateCmsContentDto) {
    const existing = await this.prisma.cmsContent.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('CMS content not found');
    return this.prisma.cmsContent.update({ where: { id }, data: dto });
  }

  findAllSettings() {
    return this.prisma.siteSetting.findMany({ orderBy: { key: 'asc' } });
  }

  // SiteSetting is a generic free-text key/value store an Admin/Director can
  // add any key to — allowlist what the public site is actually meant to see
  // (contact/branding info, the same fields already shown on public
  // quotation/voucher/invoice pages) rather than exposing the whole table.
  findPublicSettings() {
    const PUBLIC_KEYS = ['contact_email', 'contact_phone', 'instagram_url', 'company_name', 'company_address', 'gst_number', 'company_logo_url'];
    return this.prisma.siteSetting.findMany({ where: { key: { in: PUBLIC_KEYS } }, orderBy: { key: 'asc' } });
  }

  async upsertSetting(dto: UpsertSiteSettingDto) {
    return this.prisma.siteSetting.upsert({
      where: { key: dto.key },
      create: { key: dto.key, value: dto.value },
      update: { value: dto.value },
    });
  }
}
