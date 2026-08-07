import { BookingStatus, LeadSource, LeadStatus, LeadTemperature, LeaveStatus, LeaveType, QuotationStatus, Role, UserStatus } from './enums';

export interface UserDTO {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: Role;
  branchId: string | null;
  status: UserStatus;
  lastLoginAt: string | null;
  twoFactorEnabled: boolean;
}

export interface BranchDTO {
  id: string;
  name: string;
  city: string;
  managerId: string | null;
  monthlyTarget: number;
  quarterlyTarget: number;
}

export interface RateCardDTO {
  id: string;
  type: 'ACTIVITY' | 'FLIGHT' | 'HOTEL' | 'TRANSFER';
  destination: string;
  name: string;
  baseCost: number;
  taxPct: number;
  currency: string;
  source: 'MANUAL' | 'API';
  createdBy: string;
  version: number;
  active: boolean;
}

export interface LeadSummaryDTO {
  id: string;
  clientName: string;
  clientId: string | null;
  phone: string;
  email: string | null;
  destination: string;
  status: LeadStatus;
  temperature: LeadTemperature;
  source: LeadSource;
  branchId: string;
  assignedConsultantId: string | null;
  slaBreached: boolean;
  createdAt: string;
}

export interface QuotationItemDTO {
  id: string;
  rateCardId: string;
  description: string;
  snapshotAmount: number;
  quantity: number;
  rateCard?: RateCardDTO;
}

export interface QuotationSummaryDTO {
  id: string;
  refNo: string;
  leadId: string;
  consultantId: string;
  status: QuotationStatus;
  totalAmount: number;
  currency: string;
  items?: QuotationItemDTO[];
  lead?: LeadSummaryDTO;
}

export interface BookingDTO {
  id: string;
  quotationId: string;
  status: BookingStatus;
  departureDate: string;
  returnDate: string | null;
  voucherUrl: string | null;
  invoiceUrl: string | null;
  quotation?: QuotationSummaryDTO & { lead: LeadSummaryDTO };
  payments?: PaymentDTO[];
}

export interface PaymentDTO {
  id: string;
  bookingId: string;
  type: 'CLIENT_RECEIPT' | 'DMC_PAYABLE' | 'COMMISSION' | 'REFUND';
  category: 'DMC' | 'FLIGHT' | 'HOTEL' | 'ACTIVITY' | 'OTHER' | null;
  amount: number;
  dueDate: string | null;
  paidAt: string | null;
  gatewayRef: string | null;
  gatewayLinkUrl: string | null;
  couponId: string | null;
  discountAmount: number | null;
  supplierId: string | null;
}

export interface CouponDTO {
  id: string;
  code: string;
  discountType: 'PERCENTAGE' | 'FIXED';
  discountValue: number;
  validFrom: string;
  validTo: string;
  usageLimit: number | null;
  usedCount: number;
  active: boolean;
  createdBy: string;
  createdAt: string;
}

export interface TargetDTO {
  id: string;
  scope: 'BRANCH' | 'CONSULTANT';
  scopeId: string;
  period: 'WEEK' | 'MONTH' | 'QUARTER';
  revenueTarget: number;
  bookingTarget: number;
  revenueAchieved: number;
}

export interface LeaderboardRowDTO {
  consultantId?: string;
  branchId?: string;
  name: string;
  revenueTarget: number;
  revenueAchieved: number;
  conversionPct?: number;
}

export interface CalendarEntryDTO {
  bookingId: string;
  leadId: string;
  clientName: string;
  destination: string;
  departureDate: string;
  returnDate: string | null;
  readiness: 'GREEN' | 'AMBER' | 'RED';
  paymentComplete: boolean;
  docsComplete: boolean;
  daysToDeparture: number;
}

export interface SupplierDTO {
  id: string;
  name: string;
  type: 'HOTEL' | 'FLIGHT' | 'ACTIVITY' | 'TRANSFER' | 'DMC' | 'OTHER';
  contactName: string | null;
  phone: string | null;
  email: string | null;
  destination: string | null;
  gstin: string | null;
  address: string | null;
  paymentTerms: string | null;
  active: boolean;
  outstandingBalance: number;
}

export interface HotelDTO {
  id: string;
  name: string;
  category: number;
  destination: string;
  price: number;
  active: boolean;
}

export interface RoomTypeDTO {
  id: string;
  name: string;
  active: boolean;
}

export interface MealPlanDTO {
  id: string;
  name: string;
  active: boolean;
}

export interface DayItineraryDTO {
  id: string;
  title: string;
  detail: string;
  active: boolean;
}

export interface PackageItemDTO {
  id: string;
  rateCardId: string;
  dayNumber: number;
  description: string;
  quantity: number;
  rateCard?: RateCardDTO;
}

export interface PackageDTO {
  id: string;
  name: string;
  destination: string;
  theme: string | null;
  durationDays: number;
  basePrice: number;
  currency: string;
  coverImageUrl: string | null;
  active: boolean;
  createdBy: string;
  items?: PackageItemDTO[];
}

export interface VoucherDTO {
  id: string;
  bookingId: string;
  type: 'HOTEL' | 'FLIGHT' | 'TRANSFER' | 'COMBINED';
  refNo: string;
  pdfUrl: string | null;
  issuedBy: string;
  issuedAt: string;
}

export interface InvoiceDTO {
  id: string;
  bookingId: string;
  invoiceNo: string;
  type: 'MANUAL' | 'FLIGHT';
  amount: number;
  gstRate: number;
  taxAmount: number;
  customerGstin: string | null;
  currency: string;
  pdfUrl: string | null;
  issuedBy: string;
  issuedAt: string;
}

export interface ExpenseDTO {
  id: string;
  branchId: string;
  category: 'OFFICE' | 'TRAVEL' | 'MARKETING' | 'SALARY' | 'OTHER';
  description: string;
  amount: number;
  currency: string;
  expenseDate: string;
  createdBy: string;
}

export interface AttendanceDTO {
  id: string;
  userId: string;
  date: string;
  checkInAt: string | null;
  checkOutAt: string | null;
  checkInLat: number | null;
  checkInLng: number | null;
  checkOutLat: number | null;
  checkOutLng: number | null;
  status: 'PRESENT' | 'ABSENT' | 'HALF_DAY' | 'ON_LEAVE';
  user?: UserDTO;
}

export interface ConversationDTO {
  id: string;
  leadId: string;
  channel: 'WHATSAPP' | 'EMAIL' | 'PUSH';
  botEnabled: boolean;
  lastMessageAt: string;
  lead?: LeadSummaryDTO;
  messages?: MessageDTO[];
}

export interface MessageDTO {
  id: string;
  conversationId: string;
  direction: 'INBOUND' | 'OUTBOUND';
  body: string;
  status: 'SENT' | 'DELIVERED' | 'READ' | 'FAILED';
  sentBy: string | null;
  createdAt: string;
  sender?: UserDTO | null;
}

export interface TemplateDTO {
  id: string;
  channel: 'WHATSAPP' | 'EMAIL' | 'PUSH';
  name: string;
  subject: string | null;
  body: string;
  status: 'DRAFT' | 'APPROVED';
  createdBy: string;
}

export interface CmsContentDTO {
  id: string;
  type: 'BLOG' | 'BANNER' | 'TESTIMONIAL' | 'DESTINATION' | 'GALLERY';
  title: string;
  subtitle: string | null;
  body: string | null;
  imageUrl: string | null;
  linkUrl: string | null;
  rating: number | null;
  active: boolean;
  sortOrder: number;
  publishedAt: string | null;
  createdBy: string;
}

export interface SiteSettingDTO {
  id: string;
  key: string;
  value: string;
}

export interface CampaignDTO {
  id: string;
  name: string;
  channel: 'WHATSAPP' | 'EMAIL' | 'PUSH';
  templateId: string | null;
  status: 'DRAFT' | 'SCHEDULED' | 'SENT';
  audienceBranchId: string | null;
  audienceLeadStatus: string | null;
  scheduledAt: string | null;
  sentAt: string | null;
  sentCount: number;
  template?: TemplateDTO | null;
  audienceBranch?: BranchDTO | null;
}

export interface MarketingDashboardDTO {
  leadsBySource: { source: string; count: number }[];
  campaignsSentThisMonth: number;
  upcoming: { travelerId: string; name: string; leadClientName: string; type: 'BIRTHDAY' | 'ANNIVERSARY' }[];
}

export interface SessionDTO {
  id: string;
  deviceInfo: string;
  ipAddress: string;
  createdAt: string;
  current: boolean;
}

export interface AutomationRuleDTO {
  id: string;
  name: string;
  trigger: 'LEAD_CREATED' | 'LEAD_STATUS_CHANGED' | 'QUOTATION_SENT' | 'BOOKING_CONFIRMED';
  targetLeadStatus: string | null;
  delayMinutes: number;
  channel: 'WHATSAPP' | 'EMAIL' | 'PUSH';
  templateId: string | null;
  active: boolean;
  createdBy: string;
  template?: TemplateDTO | null;
}

export interface AutomationLogDTO {
  id: string;
  ruleId: string;
  leadId: string;
  firedAt: string;
  status: 'SENT' | 'DELIVERED' | 'READ' | 'FAILED';
  lead?: LeadSummaryDTO;
  rule?: AutomationRuleDTO;
}

export interface CurrencyRateDTO {
  id: string;
  code: string;
  rateToInr: number;
  source: 'MANUAL' | 'API';
  active: boolean;
  lastUpdatedAt: string;
}

export interface CustomFieldDefinitionDTO {
  id: string;
  entityType: string;
  label: string;
  fieldKey: string;
  fieldType: 'TEXT' | 'NUMBER' | 'DATE' | 'BOOLEAN' | 'SELECT';
  options: string[];
  required: boolean;
  sortOrder: number;
  active: boolean;
  createdBy: string;
}

export interface CustomFieldValueDTO {
  id: string;
  definitionId: string;
  entityId: string;
  value: string;
  definition?: CustomFieldDefinitionDTO;
}

export interface HotelRoomOptionDTO {
  roomType: string;
  mealPlan: string;
  nightlyRate: number;
  totalRate: number;
}

export interface HotelSearchResultDTO {
  hotelName: string;
  destination: string;
  starRating: number;
  address: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  rooms: HotelRoomOptionDTO[];
}

export interface FlightSearchResultDTO {
  airline: string;
  flightNumber: string;
  origin: string;
  destination: string;
  date: string;
  departureTime: string;
  arrivalTime: string;
  durationHours: number;
  fareClass: string;
  baseFare: number;
}

export interface AuditLogDTO {
  id: string;
  userId: string | null;
  action: string;
  entity: string;
  entityId: string | null;
  beforeValue: unknown;
  afterValue: unknown;
  ipAddress: string | null;
  createdAt: string;
  user?: UserDTO | null;
}

export interface DataAdminStatsDTO {
  users: number;
  leads: number;
  quotations: number;
  bookings: number;
  payments: number;
  auditLogs: number;
  cmsContent: number;
  currencyRates: number;
}

export interface UploadResponseDTO {
  url: string;
  originalName: string;
  sizeBytes: number;
}

export interface TwoFactorSetupDTO {
  secret: string;
  qrCodeDataUrl: string;
}

export type LoginResponseDTO =
  | { requiresTwoFactor: true; userId: string }
  | { requiresTwoFactor?: false; accessToken: string; user: UserDTO };

export interface ClientDTO {
  id: string;
  name: string;
  type: 'INDIVIDUAL' | 'AGENT' | 'CORPORATE' | 'GROUP';
  phone: string | null;
  email: string | null;
  gstNumber: string | null;
  commissionPct: number | null;
  notes: string | null;
  active: boolean;
}

export interface MonthlyPnLRowDTO {
  month: string;
  revenue: number;
  paymentCosts: number;
  expenses: number;
  netMargin: number;
}

export interface CostByCategoryDTO {
  category: 'DMC' | 'FLIGHT' | 'HOTEL' | 'ACTIVITY' | 'OTHER' | 'UNCATEGORIZED';
  total: number;
}

export interface PublicPackageDTO {
  id: string;
  name: string;
  destination: string;
  theme: string | null;
  durationDays: number;
  basePrice: number;
  currency: string;
  coverImageUrl: string | null;
}

export interface PublicPackageDetailDTO extends PublicPackageDTO {
  items: { dayNumber: number; description: string }[];
}

export interface TransferSearchResultDTO {
  vehicleType: string;
  capacity: number;
  pickup: string;
  drop: string;
  date: string;
  distanceKm: number;
  baseFare: number;
}

export interface LeaveRequestDTO {
  id: string;
  userId: string;
  type: LeaveType;
  startDate: string;
  endDate: string;
  reason: string | null;
  status: LeaveStatus;
  reviewedById: string | null;
  reviewedAt: string | null;
  reviewComment: string | null;
  createdAt: string;
  user?: UserDTO;
}

export interface LeaveBalanceDTO {
  type: string;
  quota: number;
  used: number;
  remaining: number;
}

export interface SalaryStructureDTO {
  id: string;
  userId: string;
  basicSalary: number;
  hra: number;
  allowances: number;
  user?: UserDTO;
}

export interface PayslipDTO {
  id: string;
  userId: string;
  month: string;
  basicSalary: number;
  hra: number;
  allowances: number;
  incentive: number;
  deductions: number;
  grossPay: number;
  netPay: number;
  presentDays: number;
  lopDays: number;
  generatedBy: string;
  generatedAt: string;
  user?: UserDTO;
}

export interface LoyaltyTransactionDTO {
  id: string;
  accountId: string;
  type: 'EARNED' | 'REDEEMED' | 'REFERRAL_BONUS' | 'ADJUSTMENT';
  points: number;
  bookingId: string | null;
  description: string | null;
  createdBy: string;
  createdAt: string;
}

export interface LoyaltyAccountDTO {
  id: string;
  clientId: string;
  points: number;
  lifetimePoints: number;
  tier: 'SILVER' | 'GOLD' | 'PLATINUM';
  transactions: LoyaltyTransactionDTO[];
}

export interface ReviewDTO {
  id: string;
  bookingId: string;
  rating: number;
  comment: string | null;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdBy: string;
  createdAt: string;
}

export interface TripFeedbackDTO {
  id: string;
  bookingId: string;
  overallSatisfaction: number;
  hotelRating: number | null;
  transportRating: number | null;
  guideRating: number | null;
  comments: string | null;
  createdBy: string;
  createdAt: string;
}

export interface InsurancePolicyDTO {
  id: string;
  bookingId: string;
  provider: string;
  policyNumber: string;
  premiumAmount: number;
  coverageAmount: number;
  startDate: string;
  endDate: string;
  status: 'ACTIVE' | 'CLAIMED' | 'EXPIRED' | 'CANCELLED';
  claimNotes: string | null;
  createdBy: string;
  createdAt: string;
}

export interface SupportTicketDTO {
  id: string;
  leadId: string;
  subject: string;
  description: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
  assignedToId: string | null;
  resolutionNote: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface TeamChannelMemberDTO {
  id: string;
  channelId: string;
  userId: string;
  joinedAt: string;
  user?: { id: string; name: string; role: string };
}

export interface TeamChannelDTO {
  id: string;
  name: string;
  type: 'BRANCH' | 'ORG_WIDE' | 'GROUP' | 'DIRECT';
  branchId: string | null;
  createdBy: string;
  lastMessageAt: string;
  createdAt: string;
  members?: TeamChannelMemberDTO[];
}

export interface PresenceDTO {
  userId: string;
  name: string;
  role: string;
  branchId: string | null;
  status: 'ONLINE' | 'BUSY' | 'OFFLINE';
}

export interface TeamMessageDTO {
  id: string;
  channelId: string;
  senderId: string;
  sender?: { id: string; name: string; role: string };
  body: string | null;
  fileUrl: string | null;
  fileName: string | null;
  fileSize: number | null;
  createdAt: string;
}

export interface CourseDTO {
  id: string;
  title: string;
  description: string;
  category: string | null;
  active: boolean;
  createdBy: string;
  createdAt: string;
  lessonCount: number;
  hasQuiz: boolean;
  enrollmentCount: number;
}

export interface LessonDTO {
  id: string;
  courseId: string;
  title: string;
  content: string;
  order: number;
  createdAt: string;
}

export interface QuizQuestionDTO {
  id: string;
  text: string;
  options: string[];
  order: number;
  correctIndex?: number;
}

export interface QuizAttemptDTO {
  id: string;
  enrollmentId: string;
  score: number;
  passed: boolean;
  attemptedAt: string;
}

export interface CertificateDTO {
  id: string;
  certNo: string;
  issuedAt: string;
  courseId: string;
  courseTitle?: string;
}

export interface CourseDetailDTO {
  id: string;
  title: string;
  description: string;
  category: string | null;
  active: boolean;
  lessons: LessonDTO[];
  quizQuestions: QuizQuestionDTO[];
  enrolled: boolean;
  completedLessonIds: string[];
  completedAt: string | null;
  latestAttempt: QuizAttemptDTO | null;
  certificate: CertificateDTO | null;
}

export interface MyLearningRowDTO {
  enrollmentId: string;
  courseId: string;
  title: string;
  category: string | null;
  enrolledAt: string;
  completedAt: string | null;
  totalLessons: number;
  completedLessons: number;
  certificate: CertificateDTO | null;
}

export interface PettyCashEntryDTO {
  id: string;
  branchId: string;
  type: 'CASH_IN' | 'CASH_OUT';
  amount: number;
  category: string | null;
  description: string;
  entryDate: string;
  createdBy: string;
  createdAt: string;
}

export interface BudgetRowDTO {
  id: string;
  branchId: string;
  category: 'OFFICE' | 'TRAVEL' | 'MARKETING' | 'SALARY' | 'OTHER';
  month: number;
  year: number;
  budgetedAmount: number;
  actualAmount: number;
  variance: number;
  percentUsed: number;
}

export interface BankTransactionDTO {
  id: string;
  branchId: string | null;
  transactionDate: string;
  description: string;
  amount: number;
  type: 'CREDIT' | 'DEBIT';
  matched: boolean;
  matchedPaymentId: string | null;
  matchedPayment?: PaymentDTO | null;
  createdBy: string;
  createdAt: string;
}

export interface DmcCommissionDTO {
  id: string;
  supplierId: string;
  supplier?: SupplierDTO;
  bookingId: string | null;
  amount: number;
  tdsAmount: number;
  status: 'PENDING' | 'RECEIVED';
  receivedAt: string | null;
  notes: string | null;
  createdBy: string;
  createdAt: string;
}

export interface DailyLedgerRowDTO {
  source: 'PAYMENT' | 'EXPENSE' | 'PETTY_CASH';
  time: string;
  description: string;
  direction: 'IN' | 'OUT';
  amount: number;
}

export interface DailyLedgerDTO {
  date: string;
  rows: DailyLedgerRowDTO[];
  totalIn: number;
  totalOut: number;
  net: number;
}

export interface GstReportRowDTO {
  invoiceNo: string;
  issuedAt: string;
  amount: number;
  gstRate: number;
  taxAmount: number;
  customerGstin: string | null;
}

export interface GstReportDTO {
  year: number;
  month: number;
  invoiceCount: number;
  taxableValue: number;
  gstCollected: number;
  totalInvoiced: number;
  rows: GstReportRowDTO[];
}

export interface AccountsDashboardDTO {
  todayNetCashFlow: number;
  todayCashIn: number;
  todayCashOut: number;
  pettyCashBalance: number;
  gstCollectedThisMonth: number;
  budgetedThisMonth: number;
  budgetCategoryCount: number;
  unmatchedBankTransactions: number;
  pendingDmcCommissions: number;
  pendingDmcCommissionAmount: number;
}
