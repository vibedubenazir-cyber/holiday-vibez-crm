'use client';

import { useEffect, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { useAuth } from '@/lib/auth-context';
import { api, ApiError } from '@/lib/api';
import { Role, type BranchDTO, type MonthlyPnLRowDTO } from '@holiday-vibez/shared';

interface DirectorDashboard {
  totalLeads: number;
  leadsByStatus: { status: string; _count: number }[];
  conversionPct: number;
  revenue: number;
  costs: number;
  grossMargin: number;
  branches: { branchId: string; name: string; revenueTarget: number; revenueAchieved: number }[];
}

interface ComplianceRow {
  travelerId: string;
  name: string;
  departureDate: string;
  passportExpiry: string | null;
  visaStatus: string | null;
  reason: string;
}

export default function ReportsPage() {
  const { user: me } = useAuth();
  const [dashboard, setDashboard] = useState<DirectorDashboard | null>(null);
  const [compliance, setCompliance] = useState<ComplianceRow[]>([]);
  const [branches, setBranches] = useState<BranchDTO[]>([]);
  const [error, setError] = useState<string | null>(null);

  const canViewPnL = me?.role === Role.DIRECTOR || me?.role === Role.ADMIN || me?.role === Role.BRANCH_MANAGER;
  const [pnlYear, setPnlYear] = useState(new Date().getFullYear());
  const [pnlBranchId, setPnlBranchId] = useState('');
  const [pnlRows, setPnlRows] = useState<MonthlyPnLRowDTO[]>([]);
  const [pnlError, setPnlError] = useState<string | null>(null);

  useEffect(() => {
    api.get<BranchDTO[]>('/branches').then(setBranches).catch(() => undefined);
    api.get<ComplianceRow[]>('/reports/compliance/expiring').then(setCompliance).catch(() => undefined);
    if (me?.role === Role.DIRECTOR || me?.role === Role.ADMIN) {
      api
        .get<DirectorDashboard>('/reports/director-dashboard')
        .then(setDashboard)
        .catch((err) => setError(err instanceof ApiError ? err.message : 'Failed to load dashboard'));
    }
  }, [me]);

  useEffect(() => {
    if (!canViewPnL) return;
    setPnlError(null);
    const params = new URLSearchParams({ year: String(pnlYear) });
    if (pnlBranchId) params.set('branchId', pnlBranchId);
    api
      .get<MonthlyPnLRowDTO[]>(`/reports/pnl/monthly?${params}`)
      .then(setPnlRows)
      .catch((err) => setPnlError(err instanceof ApiError ? err.message : 'Failed to load monthly P&L'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canViewPnL, pnlYear, pnlBranchId]);

  return (
    <AppShell>
      <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">Reports</h1>
      {error && <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>}

      {dashboard && (
        <>
          <div className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Stat label="Total leads" value={dashboard.totalLeads.toString()} />
            <Stat label="Conversion" value={`${dashboard.conversionPct}%`} />
            <Stat label="Revenue" value={`₹${dashboard.revenue.toLocaleString('en-IN')}`} />
            <Stat label="Gross margin" value={`₹${dashboard.grossMargin.toLocaleString('en-IN')}`} />
          </div>

          <h2 className="mt-6 text-sm font-semibold text-slate-700 dark:text-slate-200">Leads by status</h2>
          <div className="mt-2 flex flex-wrap gap-2">
            {dashboard.leadsByStatus.map((row) => (
              <span
                key={row.status}
                className="rounded-full bg-slate-100 dark:bg-slate-700 px-3 py-1 text-xs font-medium text-slate-700 dark:text-slate-200"
              >
                {row.status.replaceAll('_', ' ')}: {row._count}
              </span>
            ))}
            {dashboard.leadsByStatus.length === 0 && <p className="text-xs text-slate-400 dark:text-slate-500">No leads yet.</p>}
          </div>

          <h2 className="mt-6 text-sm font-semibold text-slate-700 dark:text-slate-200">Branch target vs. achieved</h2>
          <div className="mt-2 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-card transition-shadow hover:shadow-card-hover">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-900 text-left text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                <tr><th className="px-4 py-2">Branch</th><th className="px-4 py-2">Target</th><th className="px-4 py-2">Achieved</th></tr>
              </thead>
              <tbody>
                {dashboard.branches.map((b) => (
                  <tr key={b.branchId} className="border-t border-slate-100 dark:border-slate-800">
                    <td className="px-4 py-2">{b.name}</td>
                    <td className="px-4 py-2">₹{b.revenueTarget.toLocaleString('en-IN')}</td>
                    <td className="px-4 py-2">₹{b.revenueAchieved.toLocaleString('en-IN')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {canViewPnL && (
        <>
          <div className="mt-6 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Monthly P&amp;L</h2>
            <div className="flex items-center gap-2">
              {me?.role !== Role.BRANCH_MANAGER && (
                <select
                  value={pnlBranchId}
                  onChange={(e) => setPnlBranchId(e.target.value)}
                  className="rounded-lg border border-slate-300 dark:border-slate-600 px-2 py-1 text-sm"
                >
                  <option value="">All branches</option>
                  {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              )}
              <select
                value={pnlYear}
                onChange={(e) => setPnlYear(Number(e.target.value))}
                className="rounded-lg border border-slate-300 dark:border-slate-600 px-2 py-1 text-sm"
              >
                {Array.from({ length: 4 }, (_, i) => new Date().getFullYear() - i).map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Revenue and payment costs bucket by when client/DMC payments were actually recorded; expenses bucket by their own date. Net margin = revenue − payment costs − expenses.
          </p>
          {pnlError && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{pnlError}</p>}
          <div className="mt-2 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-card transition-shadow hover:shadow-card-hover">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-900 text-left text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                <tr>
                  <th className="px-4 py-2">Month</th>
                  <th className="px-4 py-2">Revenue</th>
                  <th className="px-4 py-2">Payment costs</th>
                  <th className="px-4 py-2">Expenses</th>
                  <th className="px-4 py-2">Net margin</th>
                </tr>
              </thead>
              <tbody>
                {pnlRows.map((row) => (
                  <tr key={row.month} className="border-t border-slate-100 dark:border-slate-800">
                    <td className="px-4 py-2">{row.month}</td>
                    <td className="px-4 py-2">₹{row.revenue.toLocaleString('en-IN')}</td>
                    <td className="px-4 py-2">₹{row.paymentCosts.toLocaleString('en-IN')}</td>
                    <td className="px-4 py-2">₹{row.expenses.toLocaleString('en-IN')}</td>
                    <td className={`px-4 py-2 font-medium ${row.netMargin < 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-700 dark:text-emerald-400'}`}>
                      ₹{row.netMargin.toLocaleString('en-IN')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <h2 className="mt-6 text-sm font-semibold text-slate-700 dark:text-slate-200">Passport/visa expiry compliance</h2>
      <p className="text-xs text-slate-500 dark:text-slate-400">Travelers on an upcoming booking with a passport expiring within 6 months of departure, or no visa status on file.</p>
      <div className="mt-2 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-card transition-shadow hover:shadow-card-hover">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 dark:bg-slate-900 text-left text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
            <tr><th className="px-4 py-2">Traveler</th><th className="px-4 py-2">Departure</th><th className="px-4 py-2">Passport expiry</th><th className="px-4 py-2">Reason</th></tr>
          </thead>
          <tbody>
            {compliance.map((c) => (
              <tr key={c.travelerId} className="border-t border-slate-100 dark:border-slate-800">
                <td className="px-4 py-2">{c.name}</td>
                <td className="px-4 py-2">{new Date(c.departureDate).toLocaleDateString()}</td>
                <td className="px-4 py-2">{c.passportExpiry ? new Date(c.passportExpiry).toLocaleDateString() : '—'}</td>
                <td className="px-4 py-2 text-red-600 dark:text-red-400">{c.reason}</td>
              </tr>
            ))}
            {compliance.length === 0 && <tr><td colSpan={4} className="px-4 py-6 text-center text-slate-400 dark:text-slate-500">Nothing flagged.</td></tr>}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-card transition-shadow hover:shadow-card-hover p-4">
      <p className="text-xs uppercase tracking-wide text-slate-400 dark:text-slate-500">{label}</p>
      <p className="mt-1 text-xl font-bold tracking-tight text-slate-900 dark:text-white">{value}</p>
    </div>
  );
}
