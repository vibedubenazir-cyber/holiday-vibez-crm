import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { AdminModule } from './admin/admin.module';
import { LeadsModule } from './leads/leads.module';
import { QuotationsModule } from './quotations/quotations.module';
import { BookingsModule } from './bookings/bookings.module';
import { PaymentsModule } from './payments/payments.module';
import { TargetsModule } from './targets/targets.module';
import { CalendarModule } from './calendar/calendar.module';
import { ReportsModule } from './reports/reports.module';
import { NotificationsModule } from './notifications/notifications.module';
import { SuppliersModule } from './suppliers/suppliers.module';
import { PackagesModule } from './packages/packages.module';
import { VouchersModule } from './vouchers/vouchers.module';
import { InvoicesModule } from './invoices/invoices.module';
import { ExpensesModule } from './expenses/expenses.module';
import { AttendanceModule } from './attendance/attendance.module';
import { LeaveModule } from './leave/leave.module';
import { PayrollModule } from './payroll/payroll.module';
import { LoyaltyModule } from './loyalty/loyalty.module';
import { InboxModule } from './inbox/inbox.module';
import { TemplatesModule } from './templates/templates.module';
import { CmsModule } from './cms/cms.module';
import { MarketingModule } from './marketing/marketing.module';
import { AutomationModule } from './automation/automation.module';
import { CurrencyModule } from './currency/currency.module';
import { CustomFieldsModule } from './custom-fields/custom-fields.module';
import { TravelSearchModule } from './travel-search/travel-search.module';
import { StorageModule } from './storage/storage.module';
import { DataAdminModule } from './data-admin/data-admin.module';
import { JobsModule } from './jobs/jobs.module';
import { ClientsModule } from './clients/clients.module';
import { HotelsModule } from './hotels/hotels.module';
import { RoomTypesModule } from './room-types/room-types.module';
import { MealPlansModule } from './meal-plans/meal-plans.module';
import { DayItinerariesModule } from './day-itineraries/day-itineraries.module';
import { ReviewsModule } from './reviews/reviews.module';
import { FeedbackModule } from './feedback/feedback.module';
import { InsuranceModule } from './insurance/insurance.module';
import { SupportTicketsModule } from './support-tickets/support-tickets.module';
import { PrismaService } from './prisma.service';
import { AuditLogInterceptor } from './common/interceptors/audit-log.interceptor';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    AuthModule,
    AdminModule,
    LeadsModule,
    QuotationsModule,
    BookingsModule,
    PaymentsModule,
    TargetsModule,
    CalendarModule,
    ReportsModule,
    NotificationsModule,
    SuppliersModule,
    PackagesModule,
    VouchersModule,
    InvoicesModule,
    ExpensesModule,
    AttendanceModule,
    LeaveModule,
    PayrollModule,
    LoyaltyModule,
    InboxModule,
    TemplatesModule,
    CmsModule,
    MarketingModule,
    AutomationModule,
    CurrencyModule,
    CustomFieldsModule,
    TravelSearchModule,
    StorageModule,
    DataAdminModule,
    JobsModule,
    ClientsModule,
    HotelsModule,
    RoomTypesModule,
    MealPlansModule,
    DayItinerariesModule,
    ReviewsModule,
    FeedbackModule,
    InsuranceModule,
    SupportTicketsModule,
  ],
  providers: [
    PrismaService,
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditLogInterceptor,
    },
  ],
})
export class AppModule {}
