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
  // Branch Manager/Consultant are always scoped to their own branch server-side
  // (GET /targets/leaderboard/branch rejects any other branchId for them) — so
  // only Director/Admin, who can view any branch, get a free picker here.
  const canPickBranch = me?.role === Role.DIRECTOR || me?.role === Role.ADMIN;

  const [form, setForm] = useState({ scope: 'CONSULTANT' as 'CONSULTANT' | 'BRANCH', scopeId: '', period: 'MONTH', revenueTarget: '' });

  async function loadStatic() {
    try {
      const [b, u] = await Promise.all([api.get<BranchDTO[]>('/branches'), api.get<UserDTO[]>('/users').catch(() => [])]);
      setBranches(b);
      setUsers(u);
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

  // Waits on `me` too — on first mount the auth context may not have
  // resolved the logged-in user yet, so defaulting off `me?.branchId` inside
  // loadStatic() (which only ran once, on mount) could race and silently
  // fall back to the first branch in the list instead of the user's own.
  useEffect(() => {
    if (branchId || branches.length === 0 || !me) return;
    setBranchId(me.branchId ?? branches[0].id);
  }, [branches, me, branchId]);

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
      <h1 className="text-2xl font-extrabold tracking-tight text-brand-700">Targets & Leaderboard</h1>
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      <div className="mt-4 flex items-center gap-3">
        <label className="text-sm text-slate-600">Branch:</label>
        {canPickBranch ? (
          <select value={branchId} onChange={(e) => setBranchId(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-100 transition-colors">
            {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        ) : (
          <span className="rounded-lg bg-white dark:bg-slate-800 px-3 py-2 text-sm font-medium text-slate-700 shadow-card">
            {branches.find((b) => b.id === branchId)?.name ?? '—'}
          </span>
        )}
      </div>

      {canSetTargets && (
        <form onSubmit={handleCreate} className="mt-4 grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-white dark:bg-slate-800 shadow-card transition-shadow hover:shadow-card-hover p-4 sm:grid-cols-2 lg:grid-cols-4">
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
          <button type="submit" className="rounded-xl bg-gradient-to-br from-brand-600 to-brand-500 shadow-md shadow-brand-500/25 px-3 py-2 text-sm font-medium text-white hover:opacity-90 sm:col-span-2 lg:col-span-4">
            Set target
          </button>
        </form>
      )}

      <h2 className="mt-6 text-sm font-semibold text-slate-700">Branch leaderboard</h2>
      <div className="mt-2 overflow-hidden bg-white dark:bg-slate-800">
        <table className="w-full text-sm">
          <thead className="bg-brand-50/60 text-left text-xs font-semibold uppercase tracking-wide text-brand-700 dark:bg-slate-900/40 dark:text-brand-300">
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
          <div className="mt-2 overflow-hidden bg-white dark:bg-slate-800">
            <table className="w-full text-sm">
              <thead className="bg-brand-50/60 text-left text-xs font-semibold uppercase tracking-wide text-brand-700 dark:bg-slate-900/40 dark:text-brand-300">
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
