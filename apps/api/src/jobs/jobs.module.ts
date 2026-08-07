import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { LeadsModule } from '../leads/leads.module';
import { MarketingModule } from '../marketing/marketing.module';
import { AutomationModule } from '../automation/automation.module';
import { CurrencyModule } from '../currency/currency.module';
import { ReportsModule } from '../reports/reports.module';
import { BookingsModule } from '../bookings/bookings.module';
import { JobsProcessor } from './jobs.processor';
import { JobsScheduler } from './jobs.scheduler';
import { SCHEDULED_JOBS_QUEUE } from './jobs.constants';

@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: new Redis(config.get<string>('REDIS_URL') ?? 'redis://127.0.0.1:6379', {
          maxRetriesPerRequest: null,
        }),
      }),
    }),
    BullModule.registerQueue({ name: SCHEDULED_JOBS_QUEUE }),
    LeadsModule,
    MarketingModule,
    AutomationModule,
    CurrencyModule,
    ReportsModule,
    BookingsModule,
  ],
  providers: [JobsProcessor, JobsScheduler],
})
export class JobsModule {}
