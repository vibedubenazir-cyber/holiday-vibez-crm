import { Role } from '@holiday-vibez/shared';

export type NavItem = { href: string; label: string; roles: Role[] };
export type NavGroup = { title: string | null; items: NavItem[] };
export type ModuleId = 'CRM' | 'HRMS' | 'FINANCE' | 'LMS';

export interface ModuleDef {
  id: ModuleId;
  label: string;
  description: string;
  homeHref: string;
  groups: NavGroup[];
}

const ALL_ROLES = [Role.DIRECTOR, Role.ADMIN, Role.BRANCH_MANAGER, Role.TRAVEL_CONSULTANT];
// Finance module only — Finance role gets full read/write parity with Branch
// Manager there; Auditor is read-only everywhere, so it's added item-by-item
// below rather than folded into FINANCE_ROLES.
const FINANCE_ROLES = [Role.ADMIN, Role.DIRECTOR, Role.BRANCH_MANAGER, Role.FINANCE];
const FINANCE_READ_ROLES = [...FINANCE_ROLES, Role.AUDITOR];

export const MODULES: ModuleDef[] = [
  {
    id: 'CRM',
    label: 'CRM',
    description: 'Leads, quotations, bookings, marketing, and admin — the day-to-day sales workspace.',
    homeHref: '/dashboard',
    groups: [
      { title: null, items: [{ href: '/dashboard', label: 'Dashboard', roles: ALL_ROLES }] },
      {
        title: 'Sales & CRM',
        items: [
          { href: '/leads', label: 'Leads', roles: ALL_ROLES },
          { href: '/inbox', label: 'Inbox', roles: ALL_ROLES },
          { href: '/quotations', label: 'Quotations', roles: ALL_ROLES },
          { href: '/approvals', label: 'Approvals', roles: [Role.ADMIN, Role.BRANCH_MANAGER] },
          { href: '/clients', label: 'Clients', roles: ALL_ROLES },
          { href: '/targets', label: 'Targets & Leaderboard', roles: ALL_ROLES },
        ],
      },
      {
        title: 'Operations',
        items: [
          { href: '/packages', label: 'Packages', roles: ALL_ROLES },
          { href: '/calendar', label: 'Departure Calendar', roles: ALL_ROLES },
          { href: '/hotel-masters', label: 'Hotel Masters', roles: [Role.ADMIN, Role.DIRECTOR, Role.BRANCH_MANAGER] },
          { href: '/day-itineraries', label: 'Day Itinerary', roles: [Role.ADMIN, Role.DIRECTOR, Role.BRANCH_MANAGER] },
          { href: '/support', label: 'Support Tickets', roles: ALL_ROLES },
          { href: '/team-chat', label: 'Team Chat', roles: ALL_ROLES },
        ],
      },
      {
        title: 'Marketing & Website',
        items: [
          { href: '/marketing', label: 'Marketing', roles: [Role.ADMIN, Role.DIRECTOR] },
          { href: '/cms', label: 'Website CMS', roles: [Role.ADMIN, Role.DIRECTOR, Role.BRANCH_MANAGER] },
          { href: '/templates', label: 'Templates', roles: ALL_ROLES },
          { href: '/automation', label: 'Automation', roles: [Role.ADMIN, Role.DIRECTOR] },
        ],
      },
      {
        title: 'Admin',
        items: [
          { href: '/admin/users', label: 'Users', roles: [Role.ADMIN, Role.DIRECTOR] },
          { href: '/admin/branches', label: 'Branches', roles: ALL_ROLES },
          { href: '/admin/rates', label: 'Rate Cards', roles: ALL_ROLES },
          { href: '/custom-fields', label: 'Custom Fields', roles: [Role.ADMIN, Role.DIRECTOR] },
          { href: '/storage', label: 'File Storage', roles: [Role.ADMIN, Role.DIRECTOR, Role.BRANCH_MANAGER] },
          { href: '/data-admin', label: 'Data Admin', roles: [Role.ADMIN, Role.DIRECTOR] },
          { href: '/security', label: 'Security', roles: ALL_ROLES },
        ],
      },
    ],
  },
  {
    id: 'HRMS',
    label: 'HRMS',
    description: 'Attendance, leave, and payroll — everything for managing your own staff.',
    homeHref: '/attendance',
    groups: [
      {
        title: 'Human Resources',
        items: [
          { href: '/attendance', label: 'Attendance', roles: ALL_ROLES },
          { href: '/leave', label: 'Leave', roles: ALL_ROLES },
          { href: '/payroll', label: 'Payroll', roles: ALL_ROLES },
        ],
      },
    ],
  },
  {
    id: 'FINANCE',
    label: 'Finance',
    description: 'Bookings, payments, expenses, currency, coupons, and P&L reporting.',
    homeHref: '/accounts',
    groups: [
      {
        title: 'Finance',
        items: [
          { href: '/bookings', label: 'Bookings & Payments', roles: [...ALL_ROLES, Role.FINANCE, Role.AUDITOR] },
          { href: '/expenses', label: 'Accounts & Finance', roles: FINANCE_READ_ROLES },
          { href: '/reports', label: 'Reports', roles: FINANCE_READ_ROLES },
          { href: '/currency', label: 'Currency Exchange', roles: [...ALL_ROLES, Role.FINANCE, Role.AUDITOR] },
          { href: '/coupons', label: 'Coupons & Offers', roles: [...ALL_ROLES, Role.FINANCE, Role.AUDITOR] },
          { href: '/suppliers', label: 'Vendors', roles: FINANCE_READ_ROLES },
        ],
      },
      {
        title: 'Accounts',
        items: [
          { href: '/accounts', label: 'Accounts Dashboard', roles: FINANCE_READ_ROLES },
          { href: '/petty-cash', label: 'Petty Cash', roles: FINANCE_READ_ROLES },
          { href: '/budgets', label: 'Budget & Forecast', roles: FINANCE_READ_ROLES },
          { href: '/bank-reconciliation', label: 'Bank Reconciliation', roles: FINANCE_READ_ROLES },
          { href: '/dmc-commissions', label: 'DMC Commissions', roles: FINANCE_READ_ROLES },
        ],
      },
    ],
  },
  {
    id: 'LMS',
    label: 'LMS',
    description: 'Staff training courses, quizzes, and certificates.',
    homeHref: '/lms',
    groups: [
      {
        title: 'Learning',
        items: [
          { href: '/lms', label: 'Courses', roles: ALL_ROLES },
          { href: '/lms/my-learning', label: 'My Learning & Certificates', roles: ALL_ROLES },
        ],
      },
    ],
  },
];

const STORAGE_KEY = 'hv_selected_module';

export function getSelectedModule(): ModuleId | null {
  if (typeof window === 'undefined') return null;
  const value = window.localStorage.getItem(STORAGE_KEY);
  return MODULES.some((m) => m.id === value) ? (value as ModuleId) : null;
}

export function setSelectedModule(id: ModuleId) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, id);
}

export function clearSelectedModule() {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(STORAGE_KEY);
}
