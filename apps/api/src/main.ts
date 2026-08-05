import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import cookieParser = require('cookie-parser');
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

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

  // Scheduled background jobs (SLA escalation, birthday/anniversary check,
  // automation sweep, currency refresh) are registered by JobsModule
  // (apps/api/src/jobs/) against a real BullMQ+Redis queue, not run here —
  // see jobs.scheduler.ts for the cron expressions and jobs.processor.ts for
  // what each job actually does.

  const port = process.env.PORT ?? 4000;
  await app.listen(port);
  console.log(`Holiday Vibez API listening on :${port}`);
}
bootstrap();
