'use client';

import { AppShell } from '@/components/AppShell';
import { useAuth } from '@/lib/auth-context';

export default function DashboardPage() {
  const { user } = useAuth();

  return (
    <AppShell>
      <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">Welcome, {user?.name}</h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        This is the Phase 1 foundation build: authentication, RBAC, and master data (Users, Branches, Rate
        Cards). Leads, Quotations, Bookings, Targets, and the Departure Calendar arrive in later phases.
      </p>
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border-t-4 border-t-brand border-x border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-card transition-shadow hover:shadow-card-hover p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-brand dark:text-brand-200">Role</p>
          <p className="mt-1 text-base font-medium text-slate-800 dark:text-slate-100">{user?.role}</p>
        </div>
        <div className="rounded-xl border-t-4 border-t-purple-500 border-x border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-card transition-shadow hover:shadow-card-hover p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-purple-600 dark:text-purple-300">Branch</p>
          <p className="mt-1 text-base font-medium text-slate-800 dark:text-slate-100">{user?.branchId ?? 'All branches'}</p>
        </div>
        <div className="rounded-xl border-t-4 border-t-emerald-500 border-x border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-card transition-shadow hover:shadow-card-hover p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-300">Status</p>
          <p className="mt-1 text-base font-medium text-slate-800 dark:text-slate-100">{user?.status}</p>
        </div>
      </div>
    </AppShell>
  );
}
