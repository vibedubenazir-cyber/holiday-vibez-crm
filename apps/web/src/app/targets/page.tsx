'use client';

import { FormEvent, useEffect, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { useAuth } from '@/lib/auth-context';
import { api, ApiError } from '@/lib/api';
import { Role, type BranchDTO, type LeaderboardRowDTO, type UserDTO } from '@holiday-vibez/shared';

export default function TargetsPage() {
  const { user: me } = useAuth();
  const [branches, setBranches] = useState<BranchDTO[]>([]);
  const [users, setUsers] = useState<UserDTO[]>([]);
  const [branchId, setBranchId] = useState('');
  const [leaderboard, setLeaderboard] = useState<LeaderboardRowDTO[]>([]);
  const [companyLeaderboard, setCompanyLeaderboard] = useState<LeaderboardRowDTO[]>([]);
  const [error, setError] = useState<string | null>(null);
  const canSetTargets = me?.role === Role.DIRECTOR || me?.role === Role.BRANCH_MANAGER || me?.role === Role.ADMIN;

  const [form, setForm] = useState({ scope: 'CONSULTANT' as 'CONSULTANT' | 'BRANCH', scopeId: '', period: 'MONTH', revenueTarget: '' });

  async function loadStatic() {
    try {
      const [b, u] = await Promise.all([api.get<BranchDTO[]>('/branches'), api.get<UserDTO[]>('/users').catch(() => [])]);
      setBranches(b);
      setUsers(u);
      if (!branchId && b.length) setBranchId(me?.branchId ?? b[0].id);
      const companyWide = me?.role === Role.DIRECTOR || me?.role === Role.ADMIN
        ? await api.get<LeaderboardRowDTO[]>('/targets/leaderboard/company')
        : [];
      setCompanyLeaderboard(companyWide);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load targets data');
    }
  }

  useEffect(() => {
    loadStatic();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!branchId) return;
    api
      .get<LeaderboardRowDTO[]>(`/targets/leaderboard/branch?branchId=${branchId}`)
      .then(setLeaderboard)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Failed to load leaderboard'));
  }, [branchId]);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api.post('/targets', {
        scope: form.scope,
        scopeId: form.scopeId,
        period: form.period,
        revenueTarget: Number(form.revenueTarget),
        branchId: form.scope === 'CONSULTANT' ? branchId : undefined,
      });
      setForm({ ...form, revenueTarget: '' });
      const refreshed = await api.get<LeaderboardRowDTO[]>(`/targets/leaderboard/branch?branchId=${branchId}`);
      setLeaderboard(refreshed);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to set target');
    }
  }

  const branchConsultants = users.filter((u) => u.role === Role.TRAVEL_CONSULTANT && u.branchId === branchId);

  return (
    <AppShell>
      <h1 className="inline-block rounded-lg bg-white px-4 py-2 text-xl font-bold tracking-tight text-brand shadow-card">Targets & Leaderboard</h1>
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      <div className="mt-4 flex items-center gap-3">
        <label className="text-sm text-slate-600">Branch:</label>
        <select value={branchId} onChange={(e) => setBranchId(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-100 transition-colors">
          {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
      </div>

      {canSetTargets && (
        <form onSubmit={handleCreate} className="mt-4 grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-white shadow-card transition-shadow hover:shadow-card-hover p-4 sm:grid-cols-2 lg:grid-cols-4">
          <select value={form.scope} onChange={(e) => setForm({ ...form, scope: e.target.value as 'CONSULTANT' | 'BRANCH', scopeId: '' })} className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-100 transition-colors">
            <option value="CONSULTANT">Consultant target</option>
            <option value="BRANCH">Branch target</option>
          </select>
          {form.scope === 'CONSULTANT' ? (
            <select value={form.scopeId} onChange={(e) => setForm({ ...form, scopeId: e.target.value })} className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-100 transition-colors">
              <option value="">Select consultant</option>
              {branchConsultants.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          ) : (
            <input value={branchId} readOnly className="rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-500" />
          )}
          <select value={form.period} onChange={(e) => setForm({ ...form, period: e.target.value })} className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-100 transition-colors">
            <option value="WEEK">Weekly</option>
            <option value="MONTH">Monthly</option>
            <option value="QUARTER">Quarterly</option>
          </select>
          <input required type="number" placeholder="Revenue target (₹)" value={form.revenueTarget} onChange={(e) => setForm({ ...form, revenueTarget: e.target.value })} className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-100 transition-colors" />
          <button type="submit" className="rounded-lg bg-brand px-3 py-2 text-sm font-medium text-white hover:bg-brand-dark sm:col-span-2 lg:col-span-4">
            Set target
          </button>
        </form>
      )}

      <h2 className="mt-6 text-sm font-semibold text-slate-700">Branch leaderboard</h2>
      <div className="mt-2 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-card transition-shadow hover:shadow-card-hover">
        <table className="w-full text-sm">
          <thead className="bg-brand-50/60 text-left text-xs font-semibold uppercase tracking-wide text-brand-700">
            <tr><th className="px-4 py-2">Consultant</th><th className="px-4 py-2">Target</th><th className="px-4 py-2">Achieved</th><th className="px-4 py-2">%</th></tr>
          </thead>
          <tbody>
            {leaderboard.map((row) => (
              <tr key={row.consultantId} className="border-t border-slate-100">
                <td className="px-4 py-2">{row.name}</td>
                <td className="px-4 py-2">₹{row.revenueTarget.toLocaleString('en-IN')}</td>
                <td className="px-4 py-2">₹{row.revenueAchieved.toLocaleString('en-IN')}</td>
                <td className="px-4 py-2">
                  <span className={row.conversionPct !== undefined && row.conversionPct < 40 ? 'text-red-600 font-medium' : 'text-slate-700'}>
                    {row.conversionPct ?? 0}%
                  </span>
                </td>
              </tr>
            ))}
            {leaderboard.length === 0 && <tr><td colSpan={4} className="px-4 py-6 text-center text-slate-400">No consultants or targets for this branch yet.</td></tr>}
          </tbody>
        </table>
      </div>

      {companyLeaderboard.length > 0 && (
        <>
          <h2 className="mt-6 text-sm font-semibold text-slate-700">Company-wide (branches)</h2>
          <div className="mt-2 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-card transition-shadow hover:shadow-card-hover">
            <table className="w-full text-sm">
              <thead className="bg-brand-50/60 text-left text-xs font-semibold uppercase tracking-wide text-brand-700">
                <tr><th className="px-4 py-2">Branch</th><th className="px-4 py-2">Target</th><th className="px-4 py-2">Achieved</th></tr>
              </thead>
              <tbody>
                {companyLeaderboard.map((row) => (
                  <tr key={row.branchId} className="border-t border-slate-100">
                    <td className="px-4 py-2">{row.name}</td>
                    <td className="px-4 py-2">₹{row.revenueTarget.toLocaleString('en-IN')}</td>
                    <td className="px-4 py-2">₹{row.revenueAchieved.toLocaleString('en-IN')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </AppShell>
  );
}
