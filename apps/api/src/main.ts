import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import cookieParser = require('cookie-parser');
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { LeadsService } from './leads/leads.service';

// No production job scheduler (e.g. a cron worker) exists in this environment, so the
// SLA-escalation sweep (spec Section 6 step 3) runs as an in-process interval instead.
// Swap this for a real scheduled job (BullMQ, node-cron, or an infra-level cron hitting
// an internal endpoint) before production — an in-process interval doesn't survive
// restarts or scale past a single instance.
const SLA_CHECK_INTERVAL_MS = 5 * 60 * 1000;

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

  const port = process.env.PORT ?? 4000;
  await app.listen(port);
  console.log(`Holiday Vibez API listening on :${port}`);
}
bootstrap();
