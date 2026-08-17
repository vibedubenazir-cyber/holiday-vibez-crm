'use client';

import { FormEvent, useEffect, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { useAuth } from '@/lib/auth-context';
import { api, ApiError } from '@/lib/api';
import { ReimbursementCategory, Role, type ReimbursementClaimDTO } from '@holiday-vibez/shared';

const CATEGORY_OPTIONS = [
  ReimbursementCategory.TRAVEL,
  ReimbursementCategory.CLIENT_ENTERTAINMENT,
  ReimbursementCategory.SUPPLIES,
  ReimbursementCategory.OTHER,
];

const STATUS_FILTERS = ['ALL', 'PENDING', 'APPROVED', 'REJECTED', 'PAID'] as const;
type StatusFilter = (typeof STATUS_FILTERS)[number];

const STATUS_STYLES: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-700',
  APPROVED: 'bg-blue-100 text-blue-700',
  REJECTED: 'bg-red-100 text-red-700',
  PAID: 'bg-emerald-100 text-emerald-700',
};

export default function ReimbursementsPage() {
  const { user: me } = useAuth();
  const canSeeTeam = me?.role === Role.ADMIN || me?.role === Role.DIRECTOR || me?.role === Role.BRANCH_MANAGER;
  const canApprove = me?.role === Role.ADMIN || me?.role === Role.DIRECTOR;

  const [mine, setMine] = useState<ReimbursementClaimDTO[]>([]);
  const [team, setTeam] = useState<ReimbursementClaimDTO[]>([]);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ category: ReimbursementCategory.TRAVEL as string, description: '', amount: '', expenseDate: new Date().toISOString().slice(0, 10) });

  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectComment, setRejectComment] = useState('');

  async function load() {
    try {
      setMine(await api.get<ReimbursementClaimDTO[]>('/reimbursements/me'));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load your claims');
    }
    if (canSeeTeam) {
      try {
        const qs = statusFilter === 'ALL' ? '' : `?status=${statusFilter}`;
        setTeam(await api.get<ReimbursementClaimDTO[]>(`/reimbursements${qs}`));
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'Failed to load team claims');
      }
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me?.role, statusFilter]);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api.post('/reimbursements', { ...form, amount: Number(form.amount) });
      setForm({ category: ReimbursementCategory.TRAVEL, description: '', amount: '', expenseDate: new Date().toISOString().slice(0, 10) });
      setShowForm(false);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to submit claim');
    }
  }

  async function handleApprove(id: string) {
    try {
      await api.patch(`/reimbursements/${id}/approve`, {});
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to approve claim');
    }
  }

  async function confirmReject(id: string) {
    try {
      await api.patch(`/reimbursements/${id}/reject`, { comment: rejectComment || undefined });
      setRejectingId(null);
      setRejectComment('');
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to reject claim');
    }
  }

  async function handleMarkPaid(id: string) {
    try {
      await api.patch(`/reimbursements/${id}/mark-paid`, {});
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to mark claim paid');
    }
  }

  return (
    <AppShell>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold tracking-tight text-brand-700">Reimbursements</h1>
        <button onClick={() => setShowForm((s) => !s)} className="rounded-xl bg-gradient-to-br from-brand-600 to-brand-500 px-3 py-1.5 text-sm font-semibold text-white shadow-md shadow-brand-500/25 transition hover:opacity-90">
          {showForm ? 'Cancel' : 'Submit claim'}
        </button>
      </div>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Out-of-pocket expenses you paid personally — submit for reimbursement.</p>
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      {showForm && (
        <form onSubmit={handleCreate} className="mt-4 grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-card dark:border-slate-700 dark:bg-slate-800 sm:grid-cols-2 lg:grid-cols-4">
          <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none dark:border-slate-600 dark:bg-slate-900">
            {CATEGORY_OPTIONS.map((c) => <option key={c} value={c}>{c.replace('_', ' ')}</option>)}
          </select>
          <input required type="date" value={form.expenseDate} onChange={(e) => setForm({ ...form, expenseDate: e.target.value })} className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none dark:border-slate-600 dark:bg-slate-900" />
          <input required type="number" placeholder="Amount" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none dark:border-slate-600 dark:bg-slate-900" />
          <input required placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none dark:border-slate-600 dark:bg-slate-900" />
          <button type="submit" className="rounded-xl bg-gradient-to-br from-brand-600 to-brand-500 shadow-md shadow-brand-500/25 px-3 py-2 text-sm font-medium text-white hover:opacity-90 sm:col-span-2 lg:col-span-4">Submit claim</button>
        </form>
      )}

      <p className="mt-6 text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">My Claims</p>
      <div className="mt-2 overflow-hidden bg-white dark:bg-slate-800">
        <table className="w-full text-sm">
          <thead className="bg-brand-50/60 text-left text-xs font-semibold uppercase tracking-wide text-brand-700 dark:bg-slate-900/40 dark:text-brand-300">
            <tr>
              <th className="px-4 py-2">Date</th>
              <th className="px-4 py-2">Category</th>
              <th className="px-4 py-2">Description</th>
              <th className="px-4 py-2">Amount</th>
              <th className="px-4 py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {mine.map((c) => (
              <tr key={c.id} className="border-t border-slate-100 dark:border-slate-700">
                <td className="px-4 py-2">{new Date(c.expenseDate).toLocaleDateString()}</td>
                <td className="px-4 py-2">{c.category.replace('_', ' ')}</td>
                <td className="px-4 py-2 text-slate-500 dark:text-slate-400">{c.description}</td>
                <td className="px-4 py-2">₹{Number(c.amount).toLocaleString('en-IN')}</td>
                <td className="px-4 py-2">
                  <span className={`rounded-lg px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[c.status]}`}>{c.status}</span>
                  {c.reviewComment && <div className="mt-0.5 text-[11px] text-slate-400">{c.reviewComment}</div>}
                </td>
              </tr>
            ))}
            {mine.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-6 text-center text-slate-400">No claims submitted yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {canSeeTeam && (
        <>
          <div className="mt-6 flex items-center justify-between">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
              {me?.role === Role.BRANCH_MANAGER ? "Your Branch's Claims" : 'All Claims'}
            </p>
            <div className="flex gap-1.5">
              {STATUS_FILTERS.map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`rounded-lg px-3 py-1 text-xs font-medium transition-colors ${statusFilter === s ? 'bg-brand text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300'}`}
                >
                  {s === 'ALL' ? 'All' : s.charAt(0) + s.slice(1).toLowerCase()}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-2 overflow-hidden bg-white dark:bg-slate-800">
            <table className="w-full text-sm">
              <thead className="bg-brand-50/60 text-left text-xs font-semibold uppercase tracking-wide text-brand-700 dark:bg-slate-900/40 dark:text-brand-300">
                <tr>
                  <th className="px-4 py-2">Employee</th>
                  <th className="px-4 py-2">Category</th>
                  <th className="px-4 py-2">Amount</th>
                  <th className="px-4 py-2">Status</th>
                  {canApprove && <th className="px-4 py-2 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {team.map((c) => (
                  <tr key={c.id} className="border-t border-slate-100 dark:border-slate-700">
                    <td className="px-4 py-2 font-medium text-slate-800 dark:text-slate-100">{c.user?.name}</td>
                    <td className="px-4 py-2 text-slate-500 dark:text-slate-400">{c.category.replace('_', ' ')}</td>
                    <td className="px-4 py-2">₹{Number(c.amount).toLocaleString('en-IN')}</td>
                    <td className="px-4 py-2">
                      <span className={`rounded-lg px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[c.status]}`}>{c.status}</span>
                    </td>
                    {canApprove && (
                      <td className="px-4 py-2 text-right">
                        {c.status === 'PENDING' && rejectingId !== c.id && (
                          <>
                            <button onClick={() => handleApprove(c.id)} className="mr-3 text-emerald-600 hover:underline">Approve</button>
                            <button onClick={() => { setRejectingId(c.id); setRejectComment(''); }} className="text-red-600 hover:underline">Reject</button>
                          </>
                        )}
                        {c.status === 'APPROVED' && (
                          <button onClick={() => handleMarkPaid(c.id)} className="text-brand hover:underline">Mark paid</button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
                {canApprove && rejectingId && (
                  <tr className="border-t border-slate-100 bg-red-50/40 dark:bg-red-900/10">
                    <td colSpan={5} className="px-4 py-2.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <input
                          autoFocus
                          placeholder="Reason for rejection (optional)"
                          value={rejectComment}
                          onChange={(e) => setRejectComment(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && confirmReject(rejectingId)}
                          className="flex-1 min-w-[200px] rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:border-brand focus:outline-none dark:border-slate-600 dark:bg-slate-900"
                        />
                        <button onClick={() => confirmReject(rejectingId)} className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700">Confirm reject</button>
                        <button onClick={() => setRejectingId(null)} className="text-sm text-slate-500 hover:underline">Cancel</button>
                      </div>
                    </td>
                  </tr>
                )}
                {team.length === 0 && (
                  <tr><td colSpan={canApprove ? 5 : 4} className="px-4 py-6 text-center text-slate-400">No claims match these filters.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </AppShell>
  );
}
