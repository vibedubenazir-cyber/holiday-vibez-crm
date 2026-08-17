export enum Role {
  DIRECTOR = 'DIRECTOR',
  ADMIN = 'ADMIN',
  BRANCH_MANAGER = 'BRANCH_MANAGER',
  TRAVEL_CONSULTANT = 'TRAVEL_CONSULTANT',
  FINANCE = 'FINANCE',
  AUDITOR = 'AUDITOR',
}

export enum UserStatus {
  ACTIVE = 'ACTIVE',
  ON_LEAVE = 'ON_LEAVE',
  INACTIVE = 'INACTIVE',
}

export enum LeadSource {
  GOOGLE = 'GOOGLE',
  META = 'META', // legacy value — superseded by INSTAGRAM/FACEBOOK below, kept for old rows
  WEBSITE = 'WEBSITE',
  WHATSAPP = 'WHATSAPP',
  REFERRAL = 'REFERRAL',
  WALKIN = 'WALKIN',
  INSTAGRAM = 'INSTAGRAM',
  FACEBOOK = 'FACEBOOK',
  EXISTING_CUSTOMER = 'EXISTING_CUSTOMER',
  AGENT_B2B = 'AGENT_B2B',
  PHONE_CALL = 'PHONE_CALL',
}

export enum LeadStatus {
  NEW = 'NEW',
  PROPOSAL_SENT = 'PROPOSAL_SENT',
  NO_CONNECT = 'NO_CONNECT',
  HOT_LEAD = 'HOT_LEAD',
  PROPOSAL_CONFIRMED = 'PROPOSAL_CONFIRMED',
  PLAN_DROPPED = 'PLAN_DROPPED',
  FOLLOW_UP = 'FOLLOW_UP',
  CONFIRMED = 'CONFIRMED',
  POSTPONED = 'POSTPONED',
  JUNK_NOT_INTERESTED = 'JUNK_NOT_INTERESTED',
}

export enum LeadTemperature {
  HOT = 'HOT',
  WARM = 'WARM',
  COLD = 'COLD',
}

export enum BookingStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  CANCELLED = 'CANCELLED',
  COMPLETED = 'COMPLETED',
}

export enum RateCardType {
  ACTIVITY = 'ACTIVITY',
  FLIGHT = 'FLIGHT',
  HOTEL = 'HOTEL',
  TRANSFER = 'TRANSFER',
}

export enum ClientType {
  INDIVIDUAL = 'INDIVIDUAL',
  AGENT = 'AGENT',
  CORPORATE = 'CORPORATE',
  GROUP = 'GROUP',
}

export enum RateCardSource {
  MANUAL = 'MANUAL',
  API = 'API',
}

export enum QuotationStatus {
  DRAFT = 'DRAFT',
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  SENT = 'SENT',
}

export enum PaymentType {
  CLIENT_RECEIPT = 'CLIENT_RECEIPT',
  DMC_PAYABLE = 'DMC_PAYABLE',
  COMMISSION = 'COMMISSION',
  REFUND = 'REFUND',
}

export enum PaymentCategory {
  DMC = 'DMC',
  FLIGHT = 'FLIGHT',
  HOTEL = 'HOTEL',
  ACTIVITY = 'ACTIVITY',
  OTHER = 'OTHER',
}

export enum TargetScope {
  BRANCH = 'BRANCH',
  CONSULTANT = 'CONSULTANT',
}

export enum TargetPeriod {
  WEEK = 'WEEK',
  MONTH = 'MONTH',
  QUARTER = 'QUARTER',
}

export enum NotificationChannel {
  WHATSAPP = 'WHATSAPP',
  EMAIL = 'EMAIL',
  PUSH = 'PUSH',
}

export enum NotificationStatus {
  SENT = 'SENT',
  DELIVERED = 'DELIVERED',
  READ = 'READ',
  FAILED = 'FAILED',
}

export enum SupplierType {
  HOTEL = 'HOTEL',
  FLIGHT = 'FLIGHT',
  ACTIVITY = 'ACTIVITY',
  TRANSFER = 'TRANSFER',
  DMC = 'DMC',
  OTHER = 'OTHER',
}

export enum VoucherType {
  HOTEL = 'HOTEL',
  FLIGHT = 'FLIGHT',
  TRANSFER = 'TRANSFER',
  COMBINED = 'COMBINED',
}

export enum InvoiceType {
  MANUAL = 'MANUAL',
  FLIGHT = 'FLIGHT',
}

export enum ExpenseCategory {
  OFFICE = 'OFFICE',
  TRAVEL = 'TRAVEL',
  MARKETING = 'MARKETING',
  SALARY = 'SALARY',
  OTHER = 'OTHER',
}

export enum AttendanceStatus {
  PRESENT = 'PRESENT',
  ABSENT = 'ABSENT',
  HALF_DAY = 'HALF_DAY',
  ON_LEAVE = 'ON_LEAVE',
}

export enum MessageDirection {
  INBOUND = 'INBOUND',
  OUTBOUND = 'OUTBOUND',
}

export enum TemplateStatus {
  DRAFT = 'DRAFT',
  APPROVED = 'APPROVED',
}

export enum CmsContentType {
  BLOG = 'BLOG',
  BANNER = 'BANNER',
  TESTIMONIAL = 'TESTIMONIAL',
  DESTINATION = 'DESTINATION',
  GALLERY = 'GALLERY',
}

export enum CampaignStatus {
  DRAFT = 'DRAFT',
  SCHEDULED = 'SCHEDULED',
  SENT = 'SENT',
}

export enum AutomationTrigger {
  LEAD_CREATED = 'LEAD_CREATED',
  LEAD_STATUS_CHANGED = 'LEAD_STATUS_CHANGED',
  QUOTATION_SENT = 'QUOTATION_SENT',
  BOOKING_CONFIRMED = 'BOOKING_CONFIRMED',
}

export enum CustomFieldType {
  TEXT = 'TEXT',
  NUMBER = 'NUMBER',
  DATE = 'DATE',
  BOOLEAN = 'BOOLEAN',
  SELECT = 'SELECT',
}

export enum LeaveType {
  SICK = 'SICK',
  CASUAL = 'CASUAL',
  ANNUAL = 'ANNUAL',
  UNPAID = 'UNPAID',
}

export enum LeaveStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED',
}

export enum TeamChannelType {
  BRANCH = 'BRANCH',
  ORG_WIDE = 'ORG_WIDE',
  GROUP = 'GROUP',
  DIRECT = 'DIRECT',
}

export enum CouponDiscountType {
  PERCENTAGE = 'PERCENTAGE',
  FIXED = 'FIXED',
}

export enum PresenceStatus {
  ONLINE = 'ONLINE',
  BUSY = 'BUSY',
  OFFLINE = 'OFFLINE',
}

export enum PettyCashType {
  CASH_IN = 'CASH_IN',
  CASH_OUT = 'CASH_OUT',
}

export enum BankTransactionType {
  CREDIT = 'CREDIT',
  DEBIT = 'DEBIT',
}

export enum CommissionStatus {
  PENDING = 'PENDING',
  RECEIVED = 'RECEIVED',
}

export enum AssignmentScope {
  CONSULTANT = 'CONSULTANT',
  BRANCH = 'BRANCH',
  ROLE = 'ROLE',
}

export enum ExitType {
  RESIGNATION = 'RESIGNATION',
  TERMINATION = 'TERMINATION',
}

export enum ExitStatus {
  PENDING = 'PENDING',
  CLEARED = 'CLEARED',
}

export enum PerformanceRating {
  NEEDS_IMPROVEMENT = 'NEEDS_IMPROVEMENT',
  MEETS_EXPECTATIONS = 'MEETS_EXPECTATIONS',
  EXCEEDS_EXPECTATIONS = 'EXCEEDS_EXPECTATIONS',
  OUTSTANDING = 'OUTSTANDING',
}

export enum PerformanceReviewStatus {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  ACKNOWLEDGED = 'ACKNOWLEDGED',
}

export enum ReimbursementCategory {
  TRAVEL = 'TRAVEL',
  CLIENT_ENTERTAINMENT = 'CLIENT_ENTERTAINMENT',
  SUPPLIES = 'SUPPLIES',
  OTHER = 'OTHER',
}

export enum ReimbursementStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  PAID = 'PAID',
}

export enum HrTicketCategory {
  IT_ACCESS = 'IT_ACCESS',
  PAYROLL_QUERY = 'PAYROLL_QUERY',
  BENEFITS = 'BENEFITS',
  WORKPLACE = 'WORKPLACE',
  OTHER = 'OTHER',
}

export enum GrievanceCategory {
  GENERAL_GRIEVANCE = 'GENERAL_GRIEVANCE',
  POSH_COMPLAINT = 'POSH_COMPLAINT',
}

export enum GrievanceStatus {
  SUBMITTED = 'SUBMITTED',
  UNDER_REVIEW = 'UNDER_REVIEW',
  RESOLVED = 'RESOLVED',
}

export enum ExpenseStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export enum RoomCategory {
  SINGLE = 'SINGLE',
  DOUBLE = 'DOUBLE',
  TRIPLE = 'TRIPLE',
  QUAD = 'QUAD',
  CWB = 'CWB',
  CNB = 'CNB',
}

export enum TransportationType {
  PRIVATE = 'PRIVATE',
  SIC = 'SIC',
}

export enum ItineraryNoteType {
  VISA = 'VISA',
  MEAL = 'MEAL',
  FLIGHT = 'FLIGHT',
  LEISURE = 'LEISURE',
  CRUISE = 'CRUISE',
}

// Standalone "Itinerary" module (ItineraryPlan*) — distinct from the
// quotation-nested Itinerary/ItineraryNoteType above and from DayItinerary.
export enum ItineraryPlanStatus {
  DRAFT = 'DRAFT',
  READY_TO_SHARE = 'READY_TO_SHARE',
  ARCHIVED = 'ARCHIVED',
}

export enum ItineraryEventType {
  ACCOMMODATION = 'ACCOMMODATION',
  ACTIVITY = 'ACTIVITY',
  TRANSPORTATION = 'TRANSPORTATION',
  VISA = 'VISA',
  MEAL = 'MEAL',
  FLIGHT = 'FLIGHT',
  LEISURE = 'LEISURE',
  CRUISE = 'CRUISE',
}
