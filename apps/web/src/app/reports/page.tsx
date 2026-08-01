'use client';

import { useEffect, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { useAuth } from '@/lib/auth-context';
import { api, ApiError } from '@/lib/api';
import { Role, type BranchDTO } from '@holiday-vibez/shared';

interface DirectorDashboard {
  totalLeads: number;
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

  return (
    <AppShell>
      <h1 className="text-lg font-semibold text-slate-800">Reports</h1>
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      {dashboard && (
        <>
          <div className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Stat label="Total leads" value={dashboard.totalLeads.toString()} />
            <Stat label="Conversion" value={`${dashboard.conversionPct}%`} />
            <Stat label="Revenue" value={`₹${dashboard.revenue.toLocaleString('en-IN')}`} />
            <Stat label="Gross margin" value={`₹${dashboard.grossMargin.toLocaleString('en-IN')}`} />
          </div>

          <h2 className="mt-6 text-sm font-semibold text-slate-700">Branch target vs. achieved</h2>
          <div className="mt-2 overflow-hidden rounded-lg border border-slate-200 bg-white">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr><th className="px-4 py-2">Branch</th><th className="px-4 py-2">Target</th><th className="px-4 py-2">Achieved</th></tr>
              </thead>
              <tbody>
                {dashboard.branches.map((b) => (
                  <tr key={b.branchId} className="border-t border-slate-100">
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

      <h2 className="mt-6 text-sm font-semibold text-slate-700">Passport/visa expiry compliance</h2>
      <p className="text-xs text-slate-500">Travelers on an upcoming booking with a passport expiring within 6 months of departure, or no visa status on file.</p>
      <div className="mt-2 overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr><th className="px-4 py-2">Traveler</th><th className="px-4 py-2">Departure</th><th className="px-4 py-2">Passport expiry</th><th className="px-4 py-2">Reason</th></tr>
          </thead>
          <tbody>
            {compliance.map((c) => (
              <tr key={c.travelerId} className="border-t border-slate-100">
                <td className="px-4 py-2">{c.name}</td>
                <td className="px-4 py-2">{new Date(c.departureDate).toLocaleDateString()}</td>
                <td className="px-4 py-2">{c.passportExpiry ? new Date(c.passportExpiry).toLocaleDateString() : '—'}</td>
                <td className="px-4 py-2 text-red-600">{c.reason}</td>
              </tr>
            ))}
            {compliance.length === 0 && <tr><td colSpan={4} className="px-4 py-6 text-center text-slate-400">Nothing flagged.</td></tr>}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <p className="text-xs uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-1 text-lg font-semibold text-slate-800">{value}</p>
    </div>
  );
}
