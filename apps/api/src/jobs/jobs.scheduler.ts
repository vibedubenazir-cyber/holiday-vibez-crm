import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { SCHEDULED_JOBS_QUEUE } from './jobs.constants';

export type JobName =
  | 'sla-check'
  | 'birthday-check'
  | 'automation-sweep'
  | 'currency-refresh'
  | 'compliance-check'
  | 'engagement-reminders';

// upsertJobScheduler is idempotent: calling it again with the same scheduler
// id (re)sets the schedule instead of creating a duplicate, so this can run
// unconditionally on every boot — including every `nest start --watch`
// reload — without ever double-registering a job.
const SCHEDULES: { id: JobName; pattern: string; comment: string }[] = [
  { id: 'sla-check', pattern: '*/5 * * * *', comment: 'every 5 minutes (spec Section 6 step 3)' },
  // A real deployment checks birthdays/anniversaries once a day; every 6
  // hours here only so it's demonstrable without waiting a day between runs.
  { id: 'birthday-check', pattern: '0 */6 * * *', comment: 'every 6 hours (shortened for demonstrability)' },
  { id: 'automation-sweep', pattern: '*/5 * * * *', comment: 'rule delays are minutes/hours, not days' },
  // A real forex feed only needs checking hourly — shortened for the same
  // demonstrability reason as birthday-check above.
  { id: 'currency-refresh', pattern: '*/5 * * * *', comment: 'every 5 minutes (shortened for demonstrability)' },
  // Real cadence is once a day (passport/visa status doesn't change hour to
  // hour) — shortened for the same demonstrability reason as birthday-check.
  { id: 'compliance-check', pattern: '0 */6 * * *', comment: 'every 6 hours (shortened for demonstrability)' },
  // Pre-departure/payment-due/post-trip-review WhatsApp nudges — also
  // naturally a once-a-day check, shortened for the same reason.
  { id: 'engagement-reminders', pattern: '0 */6 * * *', comment: 'every 6 hours (shortened for demonstrability)' },
];

@Injectable()
export class JobsScheduler implements OnModuleInit {
  constructor(@InjectQueue(SCHEDULED_JOBS_QUEUE) private readonly queue: Queue) {}

  async onModuleInit() {
    for (const { id, pattern } of SCHEDULES) {
      await this.queue.upsertJobScheduler(id, { pattern }, { name: id });
    }
  }
}
