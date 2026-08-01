export enum Role {
  DIRECTOR = 'DIRECTOR',
  ADMIN = 'ADMIN',
  BRANCH_MANAGER = 'BRANCH_MANAGER',
  TRAVEL_CONSULTANT = 'TRAVEL_CONSULTANT',
}

export enum UserStatus {
  ACTIVE = 'ACTIVE',
  ON_LEAVE = 'ON_LEAVE',
  INACTIVE = 'INACTIVE',
}

export enum LeadSource {
  GOOGLE = 'GOOGLE',
  META = 'META',
  WEBSITE = 'WEBSITE',
  WHATSAPP = 'WHATSAPP',
  REFERRAL = 'REFERRAL',
  WALKIN = 'WALKIN',
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

export enum RateCardType {
  ACTIVITY = 'ACTIVITY',
  FLIGHT = 'FLIGHT',
  HOTEL = 'HOTEL',
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
