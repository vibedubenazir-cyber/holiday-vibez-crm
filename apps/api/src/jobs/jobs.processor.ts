import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { LeadsService } from '../leads/leads.service';
import { MarketingService } from '../marketing/marketing.service';
import { AutomationService } from '../automation/automation.service';
import { CurrencyService } from '../currency/currency.service';
import { SCHEDULED_JOBS_QUEUE } from './jobs.constants';
import type { JobName } from './jobs.scheduler';

@Processor(SCHEDULED_JOBS_QUEUE)
export class JobsProcessor extends WorkerHost {
  constructor(
    private readonly leadsService: LeadsService,
    private readonly marketingService: MarketingService,
    private readonly automationService: AutomationService,
    private readonly currencyService: CurrencyService,
  ) {
    super();
  }

  async process(job: Job<unknown, unknown, JobName>) {
    try {
      switch (job.name) {
        case 'sla-check':
          return await this.leadsService.checkSlaBreaches();
        case 'birthday-check':
          return await this.marketingService.checkBirthdaysAndAnniversaries();
        case 'automation-sweep':
          return await this.automationService.runSweep();
        case 'currency-refresh':
          return await this.currencyService.refreshRates();
      }
    } catch (err) {
      console.error(`Scheduled job "${job.name}" failed`, err);
      throw err;
    }
  }
}
