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
import { HrCalendarModule } from './hr-calendar/hr-calendar.module';
import { AssetsModule } from './assets/assets.module';
import { AppraisalsModule } from './appraisals/appraisals.module';
import { RosterModule } from './roster/roster.module';
import { OnboardingModule } from './onboarding/onboarding.module';
import { EmployeeDocumentsModule } from './employee-documents/employee-documents.module';
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
import { ReviewsModule } from './reviews/reviews.module';
import { FeedbackModule } from './feedback/feedback.module';
import { InsuranceModule } from './insurance/insurance.module';
import { SupportTicketsModule } from './support-tickets/support-tickets.module';
import { TeamChatModule } from './team-chat/team-chat.module';
import { CouponsModule } from './coupons/coupons.module';
import { LmsModule } from './lms/lms.module';
import { PettyCashModule } from './petty-cash/petty-cash.module';
import { BudgetsModule } from './budgets/budgets.module';
import { BankReconciliationModule } from './bank-reconciliation/bank-reconciliation.module';
import { DmcCommissionsModule } from './dmc-commissions/dmc-commissions.module';
import { EmployeesModule } from './employees/employees.module';
import { ExitManagementModule } from './exit-management/exit-management.module';
import { PerformanceModule } from './performance/performance.module';
import { ReimbursementsModule } from './reimbursements/reimbursements.module';
import { HrSettingsModule } from './hr-settings/hr-settings.module';
import { ComplianceModule } from './compliance/compliance.module';
import { HrHelpdeskModule } from './hr-helpdesk/hr-helpdesk.module';
import { GrievancesModule } from './grievances/grievances.module';
import { ItineraryModule } from './itinerary/itinerary.module';
import { ItinerariesModule } from './itineraries/itineraries.module';
import { ItineraryEventTemplatesModule } from './itinerary-event-templates/itinerary-event-templates.module';
import { TravelerAuthModule } from './traveler-auth/traveler-auth.module';
import { TravelerAppModule } from './traveler-app/traveler-app.module';
import { TripTransfersModule } from './trip-transfers/trip-transfers.module';
import { TravelerDocumentsModule } from './traveler-documents/traveler-documents.module';
import { TripFlightsModule } from './trip-flights/trip-flights.module';
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
    HrCalendarModule,
    AssetsModule,
    AppraisalsModule,
    RosterModule,
    OnboardingModule,
    EmployeeDocumentsModule,
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
    ReviewsModule,
    FeedbackModule,
    InsuranceModule,
    SupportTicketsModule,
    TeamChatModule,
    CouponsModule,
    LmsModule,
    PettyCashModule,
    BudgetsModule,
    BankReconciliationModule,
    DmcCommissionsModule,
    EmployeesModule,
    ExitManagementModule,
    PerformanceModule,
    ReimbursementsModule,
    HrSettingsModule,
    ComplianceModule,
    HrHelpdeskModule,
    GrievancesModule,
    ItineraryModule,
    ItinerariesModule,
    ItineraryEventTemplatesModule,
    TravelerAuthModule,
    TravelerAppModule,
    TripTransfersModule,
    TravelerDocumentsModule,
    TripFlightsModule,
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
