import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import cookieParser = require('cookie-parser');
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { LeadsService } from './leads/leads.service';
import { MarketingService } from './marketing/marketing.service';

// No production job scheduler (e.g. a cron worker) exists in this environment, so the
// SLA-escalation sweep (spec Section 6 step 3) runs as an in-process interval instead.
// Swap this for a real scheduled job (BullMQ, node-cron, or an infra-level cron hitting
// an internal endpoint) before production — an in-process interval doesn't survive
// restarts or scale past a single instance.
const SLA_CHECK_INTERVAL_MS = 5 * 60 * 1000;
// Same in-process-interval caveat applies here (spec Section 1.1's birthday/anniversary
// automation) — a real deployment checks once a day, not every 6 hours, but a shorter
// interval makes this demonstrable without waiting a day between restarts.
const BIRTHDAY_CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000;

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(cookieParser());
  app.enableCors({
    origin: process.env.WEB_ORIGIN?.split(',') ?? ['http://localhost:3000'],
    credentials: true,
  });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalFilters(new AllExceptionsFilter());
  app.setGlobalPrefix('api');

  const leadsService = app.get(LeadsService);
  setInterval(() => {
    leadsService.checkSlaBreaches().catch((err) => console.error('SLA check failed', err));
  }, SLA_CHECK_INTERVAL_MS);

  const marketingService = app.get(MarketingService);
  setInterval(() => {
    marketingService.checkBirthdaysAndAnniversaries().catch((err) => console.error('Birthday/anniversary check failed', err));
  }, BIRTHDAY_CHECK_INTERVAL_MS);

  const port = process.env.PORT ?? 4000;
  await app.listen(port);
  console.log(`Holiday Vibez API listening on :${port}`);
}
bootstrap();
