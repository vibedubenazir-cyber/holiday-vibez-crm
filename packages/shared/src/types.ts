import { LeadSource, LeadStatus, QuotationStatus, Role, UserStatus } from './enums';

export interface UserDTO {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: Role;
  branchId: string | null;
  status: UserStatus;
  lastLoginAt: string | null;
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
  type: 'ACTIVITY' | 'FLIGHT' | 'HOTEL';
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
  phone: string;
  email: string | null;
  destination: string;
  status: LeadStatus;
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
  status: string;
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
  amount: number;
  dueDate: string | null;
  paidAt: string | null;
  gatewayRef: string | null;
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
  paymentTerms: string | null;
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
  taxAmount: number;
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

export interface LoginResponseDTO {
  accessToken: string;
  user: UserDTO;
}
