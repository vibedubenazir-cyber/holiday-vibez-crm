'use client';

import { AppShell } from '@/components/AppShell';

type Level = 'full' | 'branch' | 'own' | 'read' | 'none';

const LEVEL_LABEL: Record<Level, string> = {
  full: 'Full access',
  branch: 'Manage (own branch)',
  own: 'Own records only',
  read: 'View only',
  none: '—',
};

const LEVEL_CLASS: Record<Level, string> = {
  full: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  branch: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  own: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  read: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
  none: 'text-slate-300 dark:text-slate-600',
};

const ROLES = ['Director', 'Admin', 'Branch Manager', 'Travel Consultant', 'Finance', 'Auditor'] as const;

const ROWS: { area: string; levels: Level[] }[] = [
  { area: 'Leads, Quotations & Bookings', levels: ['full', 'full', 'full', 'own', 'none', 'read'] },
  { area: 'Payments, Invoices & Vendors', levels: ['full', 'full', 'branch', 'none', 'full', 'read'] },
  { area: 'Expenses, Petty Cash, Budgets, Bank Reconciliation, DMC Commissions', levels: ['full', 'full', 'branch', 'own', 'full', 'read'] },
  { area: 'Reports & P&L', levels: ['full', 'full', 'branch', 'none', 'full', 'read'] },
  { area: 'Employees, Attendance, Leave, Exit Management', levels: ['full', 'full', 'branch', 'own', 'none', 'none'] },
  { area: 'Payroll', levels: ['full', 'full', 'branch', 'own', 'none', 'none'] },
  { area: 'Performance Reviews', levels: ['full', 'full', 'branch', 'own', 'none', 'none'] },
  { area: 'Reimbursements', levels: ['full', 'full', 'branch', 'own', 'none', 'none'] },
  { area: 'HR Settings (leave quotas, notice/probation periods)', levels: ['full', 'full', 'read', 'read', 'read', 'read'] },
  { area: 'Compliance Calendar', levels: ['full', 'full', 'branch', 'none', 'none', 'none'] },
  { area: 'HR Helpdesk', levels: ['full', 'full', 'branch', 'own', 'none', 'none'] },
  { area: 'Grievances & POSH', levels: ['full', 'full', 'own', 'own', 'none', 'none'] },
  { area: 'HR Audit Log', levels: ['full', 'full', 'none', 'none', 'none', 'none'] },
  { area: 'LMS / Training', levels: ['full', 'full', 'branch', 'own', 'none', 'none'] },
  { area: 'Team Chat, Support Tickets, Inbox', levels: ['full', 'full', 'full', 'full', 'none', 'none'] },
  { area: 'Marketing & CMS', levels: ['full', 'full', 'none', 'none', 'none', 'none'] },
  { area: 'System Admin (Users, Branches, Rate Cards, Automation, Data Admin)', levels: ['read', 'full', 'none', 'none', 'none', 'none'] },
];

export default function PermissionsPage() {
  return (
    <AppShell>
      <h1 className="text-2xl font-extrabold tracking-tight text-brand-700">Permissions & Rules</h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        Read-only reference for what each role can see and do. Access is enforced server-side on every request — this page summarizes that behavior, it doesn&apos;t configure it.
      </p>

      <div className="mt-4 flex flex-wrap gap-3 text-xs">
        {(Object.keys(LEVEL_LABEL) as Level[]).map((l) => (
          <span key={l} className="flex items-center gap-1.5">
            <span className={`rounded px-2 py-0.5 font-medium ${LEVEL_CLASS[l]}`}>{LEVEL_LABEL[l]}</span>
          </span>
        ))}
      </div>

      <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200 bg-white dark:bg-slate-800 dark:border-slate-700 shadow-card">
        <table className="w-full min-w-[900px] text-sm">
          <thead className="bg-brand-50/60 text-left text-xs font-semibold uppercase tracking-wide text-brand-700 dark:bg-slate-900/40 dark:text-brand-300">
            <tr>
              <th className="px-4 py-2">Area</th>
              {ROLES.map((r) => (
                <th key={r} className="px-3 py-2 text-center">{r}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ROWS.map((row) => (
              <tr key={row.area} className="border-t border-slate-100 dark:border-slate-700">
                <td className="px-4 py-2 font-medium text-slate-800 dark:text-slate-100">{row.area}</td>
                {row.levels.map((lvl, i) => (
                  <td key={i} className="px-3 py-2 text-center">
                    <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${LEVEL_CLASS[lvl]}`}>{LEVEL_LABEL[lvl]}</span>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}
