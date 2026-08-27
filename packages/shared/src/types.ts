import {
  AssignmentScope,
  BookingStatus,
  ExitStatus,
  ExitType,
  ExpenseStatus,
  GrievanceCategory,
  GrievanceStatus,
  HrTicketCategory,
  LeadService,
  LeadSource,
  LeadStatus,
  LeadTemperature,
  LeaveStatus,
  LeaveType,
  PerformanceRating,
  PerformanceReviewStatus,
  QuotationStatus,
  ReimbursementCategory,
  ReimbursementStatus,
  RoomCategory,
  Role,
  TransportationType,
  ItineraryNoteType,
  ItineraryPlanStatus,
  ItineraryEventType,
  UserStatus,
  RegularisationStatus,
  EmployeeDocumentType,
  AssetType,
  AssetStatus,
  AppraisalCycleStatus,
  AppraisalStatus,
} from './enums';

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
  contactType: 'INDIVIDUAL' | 'AGENT' | 'CORPORATE' | 'GROUP';
  title: string | null;
  clientName: string;
  clientId: string | null;
  phone: string;
  email: string | null;
  destination: string;
  status: LeadStatus;
  statusNote: string | null;
  temperature: LeadTemperature;
  source: LeadSource;
  service: LeadService | null;
  branchId: string;
  assignedConsultantId: string | null;
  assignedConsultantName: string | null;
  packageLabel: string | null;
  slaBreached: boolean;
  createdAt: string;
  travelDate: string | null;
  travelEndDate: string | null;
  adultsCount: number | null;
  childrenCount: number | null;
  infantsCount: number | null;
  childrenAges: string | null;
  hotelCategory: number | null;
  mealPreference: string | null;
  transportRequired: boolean;
  visaRequired: boolean;
  flightRequired: boolean;
  insuranceRequired: boolean;
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
  status: ExpenseStatus;
  reviewedById: string | null;
  reviewedAt: string | null;
  reviewComment: string | null;
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

// Per-employee roll-up of a month's attendance, computed on read from the raw
// Attendance rows + approved leave (never persisted). Powers the summary table.
export interface AttendanceSummaryRowDTO {
  userId: string;
  name: string;
  employeeCode: string | null;
  branchId: string | null;
  presentDays: number;
  absentDays: number;
  leaveDays: number;
  avgHours: number; // mean of (check-out − check-in) across days with both punches
  totalHours: number;
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
  imageUrl: string | null;
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
  imageUrl: string | null;
  active: boolean;
  lessons: LessonDTO[];
  quizQuestions: QuizQuestionDTO[];
  enrolled: boolean;
  completedLessonIds: string[];
  completedAt: string | null;
  dueDate: string | null;
  latestAttempt: QuizAttemptDTO | null;
  certificate: CertificateDTO | null;
}

export interface MyLearningRowDTO {
  enrollmentId: string;
  courseId: string;
  title: string;
  category: string | null;
  imageUrl: string | null;
  enrolledAt: string;
  completedAt: string | null;
  dueDate: string | null;
  totalLessons: number;
  completedLessons: number;
  certificate: CertificateDTO | null;
}

export interface CourseAssignmentDTO {
  id: string;
  courseId: string;
  courseTitle: string;
  scope: AssignmentScope;
  scopeId: string;
  scopeLabel: string;
  dueDate: string | null;
  assignedBy: string;
  assignedByName: string;
  assignedAt: string;
  notes: string | null;
  userCount: number;
}

export interface TrainingCompletionRowDTO {
  enrollmentId: string;
  userId: string;
  userName: string;
  userRole: string;
  branchId: string | null;
  branchName: string | null;
  courseId: string;
  courseTitle: string;
  courseCategory: string | null;
  enrolledAt: string;
  dueDate: string | null;
  completedAt: string | null;
  assigned: boolean;
  overdue: boolean;
  latestScore: number | null;
  certNo: string | null;
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

export interface EmployeeDTO {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: Role;
  branchId: string | null;
  branchName: string | null;
  designation: string | null;
  employeeCode: string | null;
  dateOfJoining: string | null;
  profilePhotoUrl: string | null;
  reportsToId: string | null;
  reportsToName: string | null;
}

export interface OrgChartNodeDTO {
  id: string;
  name: string;
  role: Role;
  designation: string | null;
  profilePhotoUrl: string | null;
  reportsToId: string | null;
  children: OrgChartNodeDTO[];
}

export interface ExitRecordDTO {
  id: string;
  userId: string;
  user?: { id: string; name: string; role: Role; branchId: string | null };
  type: ExitType;
  noticeDate: string;
  lastWorkingDate: string;
  reason: string;
  status: ExitStatus;
  exitInterviewNotes: string | null;
  clearedById: string | null;
  clearedAt: string | null;
  createdAt: string;
}

export interface PerformanceReviewDTO {
  id: string;
  userId: string;
  user?: { name: string; branchId: string | null };
  reviewerId: string;
  reviewer?: { name: string };
  period: string;
  rating: PerformanceRating | null;
  strengths: string | null;
  improvements: string | null;
  goals: string | null;
  status: PerformanceReviewStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ReimbursementClaimDTO {
  id: string;
  userId: string;
  user?: { name: string; branchId: string | null };
  category: ReimbursementCategory;
  description: string;
  amount: number;
  expenseDate: string;
  receiptUrl: string | null;
  status: ReimbursementStatus;
  reviewedById: string | null;
  reviewedAt: string | null;
  reviewComment: string | null;
  paidAt: string | null;
  createdAt: string;
}

export interface HrSettingDTO {
  id: string;
  key: string;
  value: string;
  updatedAt: string;
}

export interface ComplianceCalendarRowDTO {
  type: 'PROBATION_END' | 'EXIT';
  userId: string;
  userName: string;
  branchId: string | null;
  branchName: string | null;
  date: string;
  detail: string;
}

export interface HrTicketDTO {
  id: string;
  userId: string;
  user?: { name: string; branchId: string | null };
  category: HrTicketCategory;
  subject: string;
  description: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
  assignedToId: string | null;
  assignedTo?: { name: string } | null;
  resolutionNote: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface GrievanceReportDTO {
  id: string;
  userId: string;
  user?: { name: string; branchId: string | null; branch?: { name: string } | null };
  category: GrievanceCategory;
  description: string;
  against: string | null;
  status: GrievanceStatus;
  resolutionNotes: string | null;
  handledById: string | null;
  handledBy?: { name: string } | null;
  createdAt: string;
  updatedAt: string;
}

export interface ItineraryAccommodationDTO {
  id: string;
  dayId: string;
  hotelName: string;
  city: string;
  checkInDate: string;
  checkOutDate: string;
  nights: number;
  roomCategory: RoomCategory;
  numberOfRooms: number;
  checkInTime: string | null;
  checkOutTime: string | null;
  description: string | null;
}

export interface ItineraryActivityDTO {
  id: string;
  dayId: string;
  destination: string;
  activityName: string;
  description: string | null;
}

export interface ItineraryTransportationDTO {
  id: string;
  dayId: string;
  type: TransportationType;
  description: string | null;
}

export interface ItineraryNoteDTO {
  id: string;
  dayId: string;
  type: ItineraryNoteType;
  description: string | null;
}

export interface ItineraryDayDTO {
  id: string;
  itineraryId: string;
  dayNumber: number;
  date: string | null;
  title: string | null;
  accommodations: ItineraryAccommodationDTO[];
  activities: ItineraryActivityDTO[];
  transportations: ItineraryTransportationDTO[];
  notes: ItineraryNoteDTO[];
}

export interface ItineraryDTO {
  id: string;
  quotationId: string;
  bookingPaymentTerms: string | null;
  pricingTerms: string | null;
  inclusionsExclusions: string | null;
  cancellationRefundPolicy: string | null;
  importantInstructions: string | null;
  createdAt: string;
  updatedAt: string;
  days: ItineraryDayDTO[];
}

// --- Standalone Itinerary module (ItineraryPlan*) ---------------------
// Distinct from ItineraryDTO above (quotation-nested). A standalone,
// optionally lead-linked itinerary with 8 event types, multiple priced
// accommodation options, package terms, an image gallery, and a public
// shareable client report.

export interface ItineraryAddOnDTO {
  name: string;
  price: number;
}

export interface ItineraryAccommodationDetails {
  hotelCategory?: number;
  roomName?: string;
  mealPlan?: string;
  single?: number;
  double?: number;
  triple?: number;
  quad?: number;
  cwb?: number;
  cnb?: number;
  checkInTime?: string;
  checkOutTime?: string;
}

export interface ItineraryFlightDetails {
  flightNumber?: string;
  fromDestination?: string;
  toDestination?: string;
  durationMinutes?: number;
}

export interface ItineraryMealDetails {
  mealType?: string;
}

// Cross-cutting, not tied to any one event type: whether this event's
// description should render as a bulleted list in the client report. Off by
// default — a consultant opts in per event rather than every multi-line
// description silently becoming a list.
export interface ItineraryDescriptionFormatDetails {
  descriptionBullets?: boolean;
}

export type ItineraryEventDetails = ItineraryAccommodationDetails &
  ItineraryFlightDetails &
  ItineraryMealDetails &
  ItineraryDescriptionFormatDetails;

export interface ItineraryPlanEventDTO {
  id: string;
  dayId: string;
  type: ItineraryEventType;
  sortOrder: number;
  name: string;
  destination: string | null;
  date: string | null;
  endDate: string | null;
  startTime: string | null;
  endTime: string | null;
  showTime: boolean;
  description: string | null;
  photoUrl: string | null;
  transferType: TransportationType | null;
  netAmount: number | null;
  markupPct: number | null;
  addOns: ItineraryAddOnDTO[] | null;
  details: ItineraryEventDetails | null;
}

export interface ItineraryPlanDayDTO {
  id: string;
  itineraryPlanId: string;
  dayNumber: number;
  date: string | null;
  events: ItineraryPlanEventDTO[];
}

export interface ItineraryPricingOptionDTO {
  id: string;
  itineraryPlanId: string;
  label: string;
  sortOrder: number;
  accommodations: ItineraryPlanEventDTO[];
  baseMarkupPct: number;
  extraMarkupAmount: number;
  cgstPct: number;
  sgstPct: number;
  igstPct: number;
  tcsPct: number;
  discountAmount: number;
}

export interface ItineraryPackageTermsDTO {
  id: string;
  itineraryPlanId: string;
  bookingAndPayment: string | null;
  pricingAndInclusions: string | null;
  cancellationsAndRefunds: string | null;
  liability: string | null;
  /** Custom section headings; null falls back to the default label. */
  bookingAndPaymentTitle: string | null;
  pricingAndInclusionsTitle: string | null;
  cancellationsAndRefundsTitle: string | null;
  liabilityTitle: string | null;
}

export interface ItineraryImageDTO {
  id: string;
  itineraryPlanId: string;
  url: string;
  caption: string | null;
  sortOrder: number;
}

export interface ItineraryPlanDTO {
  id: string;
  refNo: string;
  title: string;
  leadId: string | null;
  lead: { id: string; clientName: string; phone: string; email: string | null; destination: string } | null;
  destinations: string[];
  startDate: string | null;
  endDate: string | null;
  adultsCount: number;
  childrenCount: number;
  infantsCount: number;
  notes: string | null;
  coverPhotoUrl: string | null;
  theme: string | null;
  status: ItineraryPlanStatus;
  showOnWebsite: boolean;
  websitePerPersonPrice: number | null;
  websiteValidUntil: string | null;
  isPopular: boolean;
  isSpecial: boolean;
  aboutPackage: string | null;
  createdById: string;
  createdBy?: { name: string; email: string; phone: string } | null;
  createdAt: string;
  updatedAt: string;
  days: ItineraryPlanDayDTO[];
  pricingOptions: ItineraryPricingOptionDTO[];
  images: ItineraryImageDTO[];
  packageTerms: ItineraryPackageTermsDTO | null;
}

export interface ItineraryPlanSummaryDTO {
  id: string;
  refNo: string;
  title: string;
  leadId: string | null;
  coverPhotoUrl: string | null;
  destinations: string[];
  startDate: string | null;
  endDate: string | null;
  duration: string | null;
  price: number | null;
  websitePerPersonPrice: number | null;
  showOnWebsite: boolean;
  status: ItineraryPlanStatus;
  updatedAt: string;
}

export interface ItineraryPricingLineItemDTO {
  eventId: string;
  type: ItineraryEventType;
  name: string;
  net: number;
  markupPct: number;
  gross: number;
}

export interface ItineraryPricingOptionTotalsDTO {
  optionId: string;
  label: string;
  lineItems: ItineraryPricingLineItemDTO[];
  subtotalGross: number;
  baseMarkupPct: number;
  baseMarkupAmount: number;
  extraMarkupAmount: number;
  discountAmount: number;
  cgstPct: number;
  sgstPct: number;
  igstPct: number;
  tcsPct: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  tcsAmount: number;
  totalIncludingGst: number;
}

export interface ItineraryPricingSummaryDTO {
  refNo: string;
  options: ItineraryPricingOptionTotalsDTO[];
}

export interface ItineraryEventTemplateDTO {
  id: string;
  type: ItineraryEventType;
  destination: string;
  name: string;
  description: string | null;
  photoUrl: string | null;
  active: boolean;
}

export interface CreateItineraryPlanInput {
  title: string;
  leadId?: string;
  destinations?: string[];
  startDate?: string;
  endDate?: string;
  adultsCount?: number;
  childrenCount?: number;
  infantsCount?: number;
  notes?: string;
  theme?: string;
  showOnWebsite?: boolean;
  websitePerPersonPrice?: number;
  websiteValidUntil?: string;
  isPopular?: boolean;
  isSpecial?: boolean;
  aboutPackage?: string;
}

export interface GenerateItineraryDraftInput {
  destinations: string[];
  startDate: string;
  endDate: string;
  adultsCount?: number;
  childrenCount?: number;
  theme?: string;
  sightseeing?: string;
  hotelCategory?: string;
  transport?: string;
  transportType?: TransportationType;
  mealPlan?: string;
  pickupCity?: string;
  budget?: string;
  freeText?: string;
  notes?: string;
}

export interface ItineraryPublicEventDTO {
  id: string;
  type: ItineraryEventType;
  name: string;
  destination: string | null;
  date: string | null;
  endDate: string | null;
  startTime: string | null;
  endTime: string | null;
  showTime: boolean;
  description: string | null;
  photoUrl: string | null;
  details: ItineraryEventDetails | null;
}

export interface ItineraryPublicViewDTO {
  id: string;
  refNo: string;
  title: string;
  destinations: string[];
  startDate: string | null;
  endDate: string | null;
  adultsCount: number;
  childrenCount: number;
  infantsCount: number;
  coverPhotoUrl: string | null;
  createdAt: string;
  days: { id: string; dayNumber: number; date: string | null; events: ItineraryPublicEventDTO[] }[];
  images: { id: string; url: string; caption: string | null }[];
  packageTerms: ItineraryPackageTermsDTO | null;
  pricingOptions: {
    id: string;
    label: string;
    totalIncludingGst: number;
    accommodations: {
      id: string;
      name: string;
      destination: string | null;
      date: string | null;
      description: string | null;
      details: ItineraryEventDetails | null;
    }[];
  }[];
}

export interface WebsitePackageCardDTO {
  id: string;
  title: string;
  destinations: string[];
  nights: number;
  days: number;
  pricePerPerson: string | null;
  validUntil: string | null;
  coverPhotoUrl: string | null;
  isPopular: boolean;
  isSpecial: boolean;
  aboutPackage: string | null;
  theme: string | null;
}

// --- HRMS phase 3 -----------------------------------------------------------

export interface HolidayDTO {
  id: string;
  name: string;
  date: string;
  branchId: string | null;
  branch?: { id: string; name: string } | null;
}

export interface AttendanceRegularisationDTO {
  id: string;
  userId: string;
  user?: { id: string; name: string; employeeCode: string | null; branchId: string | null };
  date: string;
  requestedCheckInAt: string | null;
  requestedCheckOutAt: string | null;
  reason: string;
  status: RegularisationStatus;
  reviewedById: string | null;
  reviewedAt: string | null;
  reviewComment: string | null;
  createdAt: string;
}

export interface ShiftDTO {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  graceMinutes: number;
  branchId: string | null;
  active: boolean;
}

export interface RosterEntryDTO {
  id: string;
  userId: string;
  user?: { id: string; name: string; employeeCode: string | null; branchId: string | null };
  date: string;
  shiftId: string | null;
  shift?: ShiftDTO | null;
  isWeekOff: boolean;
}

export interface EmployeeDocumentDTO {
  id: string;
  userId: string;
  user?: { id: string; name: string; employeeCode: string | null; branchId: string | null };
  type: EmployeeDocumentType;
  title: string;
  fileUrl: string;
  number: string | null;
  issuedOn: string | null;
  expiresOn: string | null;
  uploadedById: string;
  createdAt: string;
}

export interface OnboardingTaskDTO {
  id: string;
  userId: string;
  title: string;
  description: string | null;
  dueDate: string | null;
  completed: boolean;
  completedAt: string | null;
  completedById: string | null;
  sortOrder: number;
}

export interface OnboardingProgressDTO {
  user: { id: string; name: string; employeeCode: string | null; dateOfJoining: string | null; branchId: string | null };
  total: number;
  done: number;
  pending: number;
}

export interface AssetDTO {
  id: string;
  assetTag: string;
  type: AssetType;
  name: string;
  serialNumber: string | null;
  purchaseDate: string | null;
  branchId: string | null;
  status: AssetStatus;
  assignedToId: string | null;
  assignedTo?: { id: string; name: string; employeeCode: string | null } | null;
  assignedAt: string | null;
  returnedAt: string | null;
  notes: string | null;
}

export interface AppraisalCycleDTO {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  status: AppraisalCycleStatus;
  _count?: { appraisals: number };
}

export interface AppraisalGoalDTO {
  id: string;
  appraisalId: string;
  title: string;
  weightPct: number;
  selfRating: number | null;
  managerRating: number | null;
  comments: string | null;
  sortOrder: number;
}

export interface AppraisalDTO {
  id: string;
  cycleId: string;
  cycle?: AppraisalCycleDTO;
  userId: string;
  user?: { id: string; name: string; employeeCode: string | null; designation: string | null; branchId?: string | null };
  managerId: string | null;
  manager?: { id: string; name: string } | null;
  status: AppraisalStatus;
  selfComments: string | null;
  managerComments: string | null;
  finalRating: number | null;
  submittedAt: string | null;
  completedAt: string | null;
  goals: AppraisalGoalDTO[];
}

export interface ConsultantOptionDTO {
  id: string;
  name: string;
  branchId: string | null;
}

export interface LeadNoteDTO {
  id: string;
  leadId: string;
  clientName?: string;
  body: string;
  channel: 'GENERAL' | 'CALL' | 'OTHER';
  authorName: string;
  createdAt: string;
}

export interface LeadReminderDTO {
  id: string;
  leadId: string;
  clientName?: string;
  note: string;
  dueAt: string;
  assignedToName: string;
  overdue?: boolean;
  completedAt?: string | null;
}

export interface DashboardStatusCardDTO {
  status: LeadStatus;
  total: number;
  today: number;
}

export interface DashboardQueryStageDTO {
  bucket: 'pending' | 'progress' | 'booked' | 'lost';
  count: number;
  pct: number;
}

export interface DashboardMonthlyQueryRowDTO {
  month: string;
  total: number;
  confirmed: number;
}

export interface DashboardFinancialRowDTO {
  month: string;
  revenue: number;
}

export interface DashboardWhatsAppRowDTO {
  id: string;
  clientName: string;
  phone: string;
  body: string;
  status: LeadStatus;
  temperature: LeadTemperature;
  createdAt: string;
}

export interface DashboardPendingPaymentDTO {
  id: string;
  bookingId: string;
  clientName: string;
  amount: number;
  dueDate: string | null;
  overdue: boolean;
}

export interface DashboardUpcomingTourDTO {
  id: string;
  clientName: string;
  destination: string;
  departureDate: string;
}

export interface DashboardTopDestinationDTO {
  destination: string;
  count: number;
}

export interface DashboardLeadSourceRowDTO {
  source: LeadSource;
  total: number;
  confirmed: number;
  lost: number;
}

export interface DashboardSalesRepRowDTO {
  consultantId: string;
  name: string;
  assigned: number;
  confirmed: number;
}

export interface DashboardOverviewDTO {
  todaysQueries: number;
  totalQueries: number;
  statusCards: DashboardStatusCardDTO[];
  queryStages: DashboardQueryStageDTO[];
  monthlyQueries: DashboardMonthlyQueryRowDTO[];
  financialSummary: DashboardFinancialRowDTO[];
  whatsappRecent: DashboardWhatsAppRowDTO[];
  reminders: LeadReminderDTO[];
  notes: LeadNoteDTO[];
  paymentCollection: DashboardPendingPaymentDTO[];
  upcomingTours: DashboardUpcomingTourDTO[];
  topDestinations: DashboardTopDestinationDTO[];
  topLeadSource: DashboardLeadSourceRowDTO[];
  salesRepresentative: DashboardSalesRepRowDTO[];
}
