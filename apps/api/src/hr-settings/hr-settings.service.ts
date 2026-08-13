import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { UpsertHrSettingDto } from './dto/hr-setting.dto';

// Well-known keys other modules read via getNumber() — kept here so the
// hr-settings frontend page and any consuming service agree on spelling.
export const HR_SETTING_KEYS = {
  LEAVE_QUOTA_SICK: 'leave_quota_sick',
  LEAVE_QUOTA_CASUAL: 'leave_quota_casual',
  LEAVE_QUOTA_ANNUAL: 'leave_quota_annual',
  STANDARD_NOTICE_PERIOD_DAYS: 'standard_notice_period_days',
  PROBATION_PERIOD_DAYS: 'probation_period_days',
} as const;

@Injectable()
export class HrSettingsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.hrSetting.findMany({ orderBy: { key: 'asc' } });
  }

  upsert(dto: UpsertHrSettingDto) {
    return this.prisma.hrSetting.upsert({
      where: { key: dto.key },
      create: { key: dto.key, value: dto.value },
      update: { value: dto.value },
    });
  }

  // Falls back to the given default when unset or non-numeric — settings
  // start with sane built-in defaults rather than requiring setup before
  // leave quotas etc. work at all.
  async getNumber(key: string, fallback: number): Promise<number> {
    const setting = await this.prisma.hrSetting.findUnique({ where: { key } });
    const parsed = setting ? Number(setting.value) : NaN;
    return Number.isFinite(parsed) ? parsed : fallback;
  }
}
