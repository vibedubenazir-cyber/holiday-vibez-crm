'use client';

import { FormEvent, useEffect, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { useAuth } from '@/lib/auth-context';
import { api, ApiError } from '@/lib/api';
import { ExpenseCategory, Role, type BranchDTO, type ExpenseDTO } from '@holiday-vibez/shared';

const CATEGORY_OPTIONS = [ExpenseCategory.OFFICE, ExpenseCategory.TRAVEL, ExpenseCategory.MARKETING, ExpenseCategory.SALARY, ExpenseCategory.OTHER];

const STATUS_FILTERS = ['ALL', 'PENDING', 'APPROVED', 'REJECTED'] as const;
type StatusFilter = (typeof STATUS_FILTERS)[number];

const STATUS_STYLES: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-700',
  APPROVED: 'bg-emerald-100 text-emerald-700',
  REJECTED: 'bg-red-100 text-red-700',
};

export default function ExpensesPage() {
  const { user: me } = useAuth();
  const [expenses, setExpenses] = useState<ExpenseDTO[]>([]);
  const [summary, setSummary] = useState<{ category: string; total: number }[]>([]);
  const [branches, setBranches] = useState<BranchDTO[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectComment, setRejectComment] = useState('');
  const needsBranchPicker = me?.role === Role.ADMIN || me?.role === Role.DIRECTOR || me?.role === Role.FINANCE || me?.role === Role.AUDITOR;
  const canManage = me?.role !== Role.AUDITOR;
  // Approval sign-off is reserved for Admin/Director — Branch Manager and
  // Finance can log expenses but not approve their own or each other's.
  const canApprove = me?.role === Role.ADMIN || me?.role === Role.DIRECTOR;

  const [form, setForm] = useState({
    branchId: '',
    category: ExpenseCategory.OFFICE as string,
    description: '',
    amount: '',
    expenseDate: new Date().toISOString().slice(0, 10),
  });

  async function load() {
    try {
      const [e, s, b] = await Promise.all([
        api.get<ExpenseDTO[]>(`/expenses${statusFilter === 'ALL' ? '' : `?status=${statusFilter}`}`),
        api.get<{ category: string; total: number }[]>('/expenses/summary'),
        api.get<BranchDTO[]>('/branches'),
      ]);
      setExpenses(e);
      setSummary(s);
      setBranches(b);
      if (needsBranchPicker && !form.branchId && b.length) setForm((f) => ({ ...f, branchId: b[0].id }));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load expenses');
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  async function handleApprove(id: string) {
    try {
      await api.patch(`/expenses/${id}/approve`, {});
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to approve expense');
    }
  }

  async function confirmReject(id: string) {
    try {
      await api.patch(`/expenses/${id}/reject`, { comment: rejectComment || undefined });
      setRejectingId(null);
      setRejectComment('');
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to reject expense');
    }
  }

  function branchName(id: string) {
    return branches.find((b) => b.id === id)?.name ?? id;
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api.post('/expenses', {
        ...form,
        branchId: form.branchId || undefined,
        amount: Number(form.amount),
      });
      setForm({ ...form, description: '', amount: '' });
      setShowForm(false);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to log expense');
    }
  }

  return (
    <AppShell>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold tracking-tight text-brand-700">Accounts & Finance — Expenses</h1>
        {canManage && (
          <button onClick={() => setShowForm((s) => !s)} className="rounded-xl bg-gradient-to-br from-brand-600 to-brand-500 px-3 py-1.5 text-sm font-semibold text-white shadow-md shadow-brand-500/25 transition hover:opacity-90">
            {showForm ? 'Cancel' : 'Log expense'}
          </button>
        )}
      </div>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        Branch Manager sees their own branch; Admin/Director/Finance see and log expenses for any branch. Logged expenses stay Pending until an Admin/Director approves them — only approved expenses count toward reports and budgets.
      </p>
      {!canManage && <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Read-only — auditor access.</p>}

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      <div className="mt-3 flex gap-1.5">
        {STATUS_FILTERS.map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`rounded-lg px-3 py-1 text-xs font-medium transition-colors ${
              statusFilter === s ? 'bg-brand text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300'
            }`}
          >
            {s === 'ALL' ? 'All' : s.charAt(0) + s.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
        {summary.map((s) => (
          <div key={s.category} className="rounded-xl border border-slate-200 bg-white dark:bg-slate-800 shadow-card transition-shadow hover:shadow-card-hover p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-brand">{s.category}</p>
            <p className="mt-1 text-base font-medium text-slate-800">₹{s.total.toLocaleString('en-IN')}</p>
          </div>
        ))}
        {summary.length === 0 && <p className="col-span-full text-sm text-slate-400">No expenses logged yet.</p>}
      </div>

      {canManage && showForm && (
        <form onSubmit={handleCreate} className="mt-4 grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-white dark:bg-slate-800 shadow-card transition-shadow hover:shadow-card-hover p-4 sm:grid-cols-2 lg:grid-cols-3">
          {needsBranchPicker && (
            <select value={form.branchId} onChange={(e) => setForm({ ...form, branchId: e.target.value })} className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-100 transition-colors">
              {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          )}
          <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-100 transition-colors">
            {CATEGORY_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <input required type="date" value={form.expenseDate} onChange={(e) => setForm({ ...form, expenseDate: e.target.value })} className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-100 transition-colors" />
          <input required type="number" placeholder="Amount" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-100 transition-colors" />
          <input required placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-100 transition-colors sm:col-span-2 lg:col-span-3" />
          <button type="submit" className="rounded-xl bg-gradient-to-br from-brand-600 to-brand-500 shadow-md shadow-brand-500/25 px-3 py-2 text-sm font-medium text-white hover:opacity-90 sm:col-span-2 lg:col-span-3">
            Log expense
          </button>
        </form>
      )}

      <div className="mt-4 overflow-x-auto bg-white dark:bg-slate-800">
        <table className="w-full min-w-[760px] text-sm lg:min-w-0">
          <thead className="bg-brand-50/60 text-left text-xs font-semibold uppercase tracking-wide text-brand-700 dark:bg-slate-900/40 dark:text-brand-300">
            <tr>
              <th className="px-4 py-2">Date</th>
              <th className="px-4 py-2">Branch</th>
              <th className="px-4 py-2">Category</th>
              <th className="px-4 py-2">Description</th>
              <th className="px-4 py-2">Amount</th>
              <th className="px-4 py-2">Status</th>
              {canApprove && <th className="px-4 py-2 text-right">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {expenses.map((e) => (
              <tr key={e.id} className="border-t border-slate-100">
                <td className="px-4 py-2">{new Date(e.expenseDate).toLocaleDateString()}</td>
                <td className="px-4 py-2">{branchName(e.branchId)}</td>
                <td className="px-4 py-2">{e.category}</td>
                <td className="px-4 py-2 text-slate-500">{e.description}</td>
                <td className="px-4 py-2">₹{Number(e.amount).toLocaleString('en-IN')}</td>
                <td className="px-4 py-2">
                  <span className={`rounded-lg px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[e.status]}`}>{e.status}</span>
                  {e.status !== 'PENDING' && e.reviewComment && (
                    <div className="mt-0.5 text-[11px] text-slate-400">{e.reviewComment}</div>
                  )}
                </td>
                {canApprove && (
                  <td className="px-4 py-2 text-right">
                    {e.status === 'PENDING' && rejectingId !== e.id && (
                      <>
                        <button onClick={() => handleApprove(e.id)} className="mr-3 text-emerald-600 hover:underline">Approve</button>
                        <button onClick={() => { setRejectingId(e.id); setRejectComment(''); }} className="text-red-600 hover:underline">Reject</button>
                      </>
                    )}
                  </td>
                )}
              </tr>
            ))}
            {rejectingId && canApprove && (
              <tr className="border-t border-slate-100 bg-red-50/40 dark:bg-red-900/10">
                <td colSpan={7} className="px-4 py-2.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      autoFocus
                      placeholder="Reason for rejection (optional)"
                      value={rejectComment}
                      onChange={(e) => setRejectComment(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && confirmReject(rejectingId)}
                      className="flex-1 min-w-[200px] rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-100 transition-colors"
                    />
                    <button onClick={() => confirmReject(rejectingId)} className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700">Confirm reject</button>
                    <button onClick={() => setRejectingId(null)} className="text-sm text-slate-500 hover:underline">Cancel</button>
                  </div>
                </td>
              </tr>
            )}
            {expenses.length === 0 && (
              <tr><td colSpan={canApprove ? 7 : 6} className="px-4 py-6 text-center text-slate-400">No expenses logged yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}
