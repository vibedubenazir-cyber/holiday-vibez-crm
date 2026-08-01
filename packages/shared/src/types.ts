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
  destination: string;
  status: LeadStatus;
  source: LeadSource;
  branchId: string;
  assignedConsultantId: string | null;
}

export interface QuotationSummaryDTO {
  id: string;
  refNo: string;
  status: QuotationStatus;
  totalAmount: number;
  currency: string;
}

export interface SessionDTO {
  id: string;
  deviceInfo: string;
  ipAddress: string;
  createdAt: string;
  current: boolean;
}

export interface LoginResponseDTO {
  accessToken: string;
  user: UserDTO;
}
