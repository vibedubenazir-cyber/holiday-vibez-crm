import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import * as cron from 'node-cron';
import cookieParser = require('cookie-parser');
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { LeadsService } from './leads/leads.service';
import { MarketingService } from './marketing/marketing.service';
import { AutomationService } from './automation/automation.service';
import { CurrencyService } from './currency/currency.service';

// No production job scheduler (e.g. a managed cron worker) exists in this
// environment, so these run as node-cron schedules inside the API process
// instead — real cron syntax and timezone handling instead of raw
// setInterval millisecond math, but still a single in-process scheduler: it
// doesn't survive a restart mid-tick and doesn't coordinate across multiple
// instances the way BullMQ+Redis would (Redis is already provisioned in
// infra/docker-compose.yml but nothing in this app uses it yet — that's the
// natural next step for durable job execution, not done here).
const SLA_CHECK_CRON = '*/5 * * * *'; // every 5 minutes (spec Section 6 step 3)
// A real deployment checks birthdays/anniversaries once a day; every 6 hours
// here only so it's demonstrable without waiting a day between restarts.
const BIRTHDAY_CHECK_CRON = '0 */6 * * *';
const AUTOMATION_SWEEP_CRON = '*/5 * * * *'; // rule delays are minutes/hours, not days
// A real forex feed only needs checking hourly — shortened for the same
// demonstrability reason as BIRTHDAY_CHECK_CRON above.
const CURRENCY_REFRESH_CRON = '*/5 * * * *';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.use(cookieParser());
  app.enableCors({
    origin: process.env.WEB_ORIGIN?.split(',') ?? ['http://localhost:3000'],
    credentials: true,
  });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalFilters(new AllExceptionsFilter());
  app.setGlobalPrefix('api');

  // Local-disk stand-in for real object storage (see storage.controller.ts) —
  // served at /uploads/*, outside the /api prefix set above.
  app.useStaticAssets(join(__dirname, '..', '..', 'uploads'), { prefix: '/uploads/' });

  const leadsService = app.get(LeadsService);
  cron.schedule(SLA_CHECK_CRON, () => {
    leadsService.checkSlaBreaches().catch((err) => console.error('SLA check failed', err));
  });

  const marketingService = app.get(MarketingService);
  cron.schedule(BIRTHDAY_CHECK_CRON, () => {
    marketingService.checkBirthdaysAndAnniversaries().catch((err) => console.error('Birthday/anniversary check failed', err));
  });

  const automationService = app.get(AutomationService);
  cron.schedule(AUTOMATION_SWEEP_CRON, () => {
    automationService.runSweep().catch((err) => console.error('Automation sweep failed', err));
  });

  const currencyService = app.get(CurrencyService);
  cron.schedule(CURRENCY_REFRESH_CRON, () => {
    currencyService.refreshRates().catch((err) => console.error('Currency rate refresh failed', err));
  });

  const port = process.env.PORT ?? 4000;
  await app.listen(port);
  console.log(`Holiday Vibez API listening on :${port}`);
}
bootstrap();
