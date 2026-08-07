'use client';

import { FormEvent, useEffect, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { useAuth } from '@/lib/auth-context';
import { api, ApiError } from '@/lib/api';
import { LeaveType, Role, type LeaveBalanceDTO, type LeaveRequestDTO } from '@holiday-vibez/shared';

const TYPE_OPTIONS = [LeaveType.SICK, LeaveType.CASUAL, LeaveType.ANNUAL, LeaveType.UNPAID];

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-slate-200 text-slate-700',
  APPROVED: 'bg-blue-100 text-blue-700',
  REJECTED: 'bg-red-100 text-red-700',
  CANCELLED: 'bg-slate-100 text-slate-400',
};

export default function LeavePage() {
  const { user: me } = useAuth();
  const canApprove = me?.role === Role.ADMIN || me?.role === Role.DIRECTOR || me?.role === Role.BRANCH_MANAGER;

  const [balance, setBalance] = useState<LeaveBalanceDTO[]>([]);
  const [mine, setMine] = useState<LeaveRequestDTO[]>([]);
  const [team, setTeam] = useState<LeaveRequestDTO[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ type: LeaveType.CASUAL as string, startDate: '', endDate: '', reason: '' });

  async function load() {
    try {
      setBalance(await api.get<LeaveBalanceDTO[]>('/leave/me/balance'));
      setMine(await api.get<LeaveRequestDTO[]>('/leave/me'));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load leave data');
    }
    if (canApprove) {
      try {
        setTeam(await api.get<LeaveRequestDTO[]>('/leave'));
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'Failed to load team leave requests');
      }
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me?.role]);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api.post('/leave', form);
      setForm({ type: LeaveType.CASUAL, startDate: '', endDate: '', reason: '' });
      setShowForm(false);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to submit leave request');
    }
  }

  async function handleCancel(id: string) {
    try {
      await api.patch(`/leave/${id}/cancel`);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to cancel request');
    }
  }

  async function handleApprove(id: string) {
    try {
      await api.patch(`/leave/${id}/approve`);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to approve request');
    }
  }

  async function handleReject(id: string) {
    try {
      await api.patch(`/leave/${id}/reject`);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to reject request');
    }
  }

  function days(a: LeaveRequestDTO) {
    const ms = new Date(a.endDate).getTime() - new Date(a.startDate).getTime();
    return Math.round(ms / 86400000) + 1;
  }

  return (
    <AppShell>
      <div className="flex items-center justify-between">
        <h1 className="inline-block rounded-lg bg-white px-4 py-2 text-xl font-bold tracking-tight text-brand shadow-card">Leave</h1>
        <button onClick={() => setShowForm((s) => !s)} className="rounded-lg bg-gradient-to-r from-brand to-brand-500 px-3 py-1.5 text-sm font-medium text-white shadow-card transition-all hover:shadow-card-hover hover:brightness-105">
          {showForm ? 'Cancel' : 'Request leave'}
        </button>
      </div>
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {balance.map((b) => (
          <div key={b.type} className="border-l-4 border-l-blue-500 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">{b.type.charAt(0) + b.type.slice(1).toLowerCase()} leave</p>
            <p className="mt-1 text-2xl font-semibold text-slate-800">
              {b.remaining}
              <span className="text-sm font-normal text-slate-400"> / {b.quota} days left</span>
            </p>
          </div>
        ))}
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="mt-4 grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-white shadow-card transition-shadow hover:shadow-card-hover p-4 sm:grid-cols-2 lg:grid-cols-4">
          <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-100 transition-colors">
            {TYPE_OPTIONS.map((t) => <option key={t} value={t}>{t.charAt(0) + t.slice(1).toLowerCase()}</option>)}
          </select>
          <input required type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-100 transition-colors" />
          <input required type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-100 transition-colors" />
          <input placeholder="Reason (optional)" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-100 transition-colors" />
          <button type="submit" className="rounded-lg bg-brand px-3 py-2 text-sm font-medium text-white hover:bg-brand-dark sm:col-span-2 lg:col-span-4">
            Submit request
          </button>
        </form>
      )}

      <h2 className="mt-6 text-sm font-semibold text-white">My requests</h2>
      <div className="mt-2 overflow-hidden bg-white">
        <table className="w-full text-sm">
          <thead className="bg-brand-50/60 text-left text-xs font-semibold uppercase tracking-wide text-brand-700">
            <tr>
              <th className="px-4 py-2">Type</th>
              <th className="px-4 py-2">Dates</th>
              <th className="px-4 py-2">Days</th>
              <th className="px-4 py-2">Reason</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {mine.map((r) => (
              <tr key={r.id} className="border-t border-slate-100">
                <td className="px-4 py-2 font-medium text-slate-800">{r.type.charAt(0) + r.type.slice(1).toLowerCase()}</td>
                <td className="px-4 py-2 text-slate-500">{new Date(r.startDate).toLocaleDateString()} – {new Date(r.endDate).toLocaleDateString()}</td>
                <td className="px-4 py-2">{days(r)}</td>
                <td className="px-4 py-2 text-slate-500">{r.reason ?? '—'}</td>
                <td className="px-4 py-2">
                  <span className={`rounded-lg px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[r.status] ?? 'bg-slate-100 text-slate-600'}`}>{r.status}</span>
                </td>
                <td className="px-4 py-2 text-right">
                  {r.status === 'PENDING' && (
                    <button onClick={() => handleCancel(r.id)} className="text-red-600 hover:underline">Cancel</button>
                  )}
                </td>
              </tr>
            ))}
            {mine.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-6 text-center text-slate-400">No leave requests yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {canApprove && (
        <>
          <h2 className="mt-6 text-sm font-semibold text-white">Team requests</h2>
          <div className="mt-2 overflow-hidden bg-white">
            <table className="w-full text-sm">
              <thead className="bg-brand-50/60 text-left text-xs font-semibold uppercase tracking-wide text-brand-700">
                <tr>
                  <th className="px-4 py-2">Employee</th>
                  <th className="px-4 py-2">Type</th>
                  <th className="px-4 py-2">Dates</th>
                  <th className="px-4 py-2">Days</th>
                  <th className="px-4 py-2">Status</th>
                  <th className="px-4 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {team.map((r) => (
                  <tr key={r.id} className="border-t border-slate-100">
                    <td className="px-4 py-2 font-medium text-slate-800">{r.user?.name}</td>
                    <td className="px-4 py-2">{r.type.charAt(0) + r.type.slice(1).toLowerCase()}</td>
                    <td className="px-4 py-2 text-slate-500">{new Date(r.startDate).toLocaleDateString()} – {new Date(r.endDate).toLocaleDateString()}</td>
                    <td className="px-4 py-2">{days(r)}</td>
                    <td className="px-4 py-2">
                      <span className={`rounded-lg px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[r.status] ?? 'bg-slate-100 text-slate-600'}`}>{r.status}</span>
                    </td>
                    <td className="px-4 py-2 text-right">
                      {r.status === 'PENDING' && (
                        <span className="flex justify-end gap-2">
                          <button onClick={() => handleApprove(r.id)} className="text-brand hover:underline">Approve</button>
                          <button onClick={() => handleReject(r.id)} className="text-red-600 hover:underline">Reject</button>
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
                {team.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-6 text-center text-slate-400">No team leave requests.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </AppShell>
  );
}
