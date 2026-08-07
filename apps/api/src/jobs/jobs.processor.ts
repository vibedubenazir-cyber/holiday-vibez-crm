import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { LeadsService } from '../leads/leads.service';
import { MarketingService } from '../marketing/marketing.service';
import { AutomationService } from '../automation/automation.service';
import { CurrencyService } from '../currency/currency.service';
import { ReportsService } from '../reports/reports.service';
import { BookingsService } from '../bookings/bookings.service';
import { CalendarService } from '../calendar/calendar.service';
import { SCHEDULED_JOBS_QUEUE } from './jobs.constants';
import type { JobName } from './jobs.scheduler';

@Processor(SCHEDULED_JOBS_QUEUE)
export class JobsProcessor extends WorkerHost {
  constructor(
    private readonly leadsService: LeadsService,
    private readonly marketingService: MarketingService,
    private readonly automationService: AutomationService,
    private readonly currencyService: CurrencyService,
    private readonly reportsService: ReportsService,
    private readonly bookingsService: BookingsService,
    private readonly calendarService: CalendarService,
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
        case 'compliance-check':
          return await this.reportsService.notifyComplianceIssues();
        case 'engagement-reminders':
          return await this.bookingsService.sendEngagementReminders();
        case 'consultant-departure-reminders':
          return await this.calendarService.notifyUpcomingDepartures();
      }
    } catch (err) {
      console.error(`Scheduled job "${job.name}" failed`, err);
      throw err;
    }
  }
}
