import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { RequestMethod, ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import cookieParser = require('cookie-parser');
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

async function bootstrap() {
  // rawBody: true — needed to verify the WhatsApp webhook's X-Hub-Signature-256
  // header (HMAC over the exact raw bytes Meta sent, not the re-serialized JSON).
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { rawBody: true });
  app.use(cookieParser());
  app.enableCors({
    origin: process.env.WEB_ORIGIN?.split(',') ?? ['http://localhost:3000'],
    credentials: true,
  });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalFilters(new AllExceptionsFilter());
  // 'uploads' is excluded from the /api prefix so it stays at plain
  // "/uploads/:key" — both the local-disk static middleware below and
  // UploadsRedirectController's presigned-URL fallback (see
  // storage/uploads-redirect.controller.ts) need to live at that exact path,
  // since storage.controller.ts returns "/uploads/:key" for both storage modes.
  app.setGlobalPrefix('api', { exclude: [{ path: 'uploads/(.*)', method: RequestMethod.ALL }] });

  // Local-disk stand-in for real object storage (see storage.controller.ts) —
  // served at /uploads/*, outside the /api prefix set above. __dirname is
  // apps/api/dist at runtime, so this must go up exactly one level to reach
  // apps/api/uploads — the same directory storage.controller.ts writes to.
  // When a file isn't found here (S3 mode, where uploads never touch disk),
  // this middleware calls next() and falls through to
  // UploadsRedirectController's route at the same path.
  app.useStaticAssets(join(__dirname, '..', 'uploads'), { prefix: '/uploads/' });

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
