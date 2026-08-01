'use client';

import { AppShell } from '@/components/AppShell';
import { useAuth } from '@/lib/auth-context';

export default function DashboardPage() {
  const { user } = useAuth();

  return (
    <AppShell>
      <h1 className="text-lg font-semibold text-slate-800">Welcome, {user?.name}</h1>
      <p className="mt-1 text-sm text-slate-500">
        This is the Phase 1 foundation build: authentication, RBAC, and master data (Users, Branches, Rate
        Cards). Leads, Quotations, Bookings, Targets, and the Departure Calendar arrive in later phases.
      </p>
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-xs uppercase tracking-wide text-slate-400">Role</p>
          <p className="mt-1 text-base font-medium text-slate-800">{user?.role}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-xs uppercase tracking-wide text-slate-400">Branch</p>
          <p className="mt-1 text-base font-medium text-slate-800">{user?.branchId ?? 'All branches'}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-xs uppercase tracking-wide text-slate-400">Status</p>
          <p className="mt-1 text-base font-medium text-slate-800">{user?.status}</p>
        </div>
      </div>
    </AppShell>
  );
}
