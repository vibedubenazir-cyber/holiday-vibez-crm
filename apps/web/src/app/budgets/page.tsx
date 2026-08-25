'use client';

import { FormEvent, useEffect, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { useAuth } from '@/lib/auth-context';
import { api, ApiError } from '@/lib/api';
import { ExpenseCategory, Role, type BranchDTO, type BudgetRowDTO } from '@holiday-vibez/shared';

const CATEGORY_OPTIONS = [ExpenseCategory.OFFICE, ExpenseCategory.TRAVEL, ExpenseCategory.MARKETING, ExpenseCategory.SALARY, ExpenseCategory.OTHER];
const now = new Date();

export default function BudgetsPage() {
  const { user: me } = useAuth();
  const [rows, setRows] = useState<BudgetRowDTO[]>([]);
  const [branches, setBranches] = useState<BranchDTO[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const needsBranchPicker = me?.role === Role.ADMIN || me?.role === Role.DIRECTOR || me?.role === Role.FINANCE || me?.role === Role.AUDITOR;
  const canManage = me?.role !== Role.AUDITOR;

  const [form, setForm] = useState({ branchId: '', category: ExpenseCategory.OFFICE as string, budgetedAmount: '' });

  async function load() {
    try {
      const [r, b] = await Promise.all([
        api.get<BudgetRowDTO[]>(`/budgets?month=${month}&year=${year}`),
        api.get<BranchDTO[]>('/branches'),
      ]);
      setRows(r);
      setBranches(b);
      if (needsBranchPicker && !form.branchId && b.length) setForm((f) => ({ ...f, branchId: b[0].id }));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load budgets');
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month, year]);

  function branchName(id: string) {
    return branches.find((b) => b.id === id)?.name ?? id;
  }

  async function handleSet(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api.put('/budgets', {
        branchId: form.branchId || undefined,
        category: form.category,
        month,
        year,
        budgetedAmount: Number(form.budgetedAmount),
      });
      setForm({ ...form, budgetedAmount: '' });
      setShowForm(false);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to set budget');
    }
  }

  return (
    <AppShell>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold tracking-tight text-brand-700">Budget & Forecast</h1>
        {canManage && (
          <button onClick={() => setShowForm((s) => !s)} className="rounded-xl bg-gradient-to-br from-brand-600 to-brand-500 px-3 py-1.5 text-sm font-semibold text-white shadow-md shadow-brand-500/25 transition hover:opacity-90">
            {showForm ? 'Cancel' : 'Set budget'}
          </button>
        )}
      </div>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Expense budgets vs actuals, per branch and category.</p>
      {!canManage && <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Read-only — auditor access.</p>}

      <div className="mt-3 flex items-center gap-2">
        <select value={month} onChange={(e) => setMonth(Number(e.target.value))} className="rounded-lg border-none bg-white dark:bg-slate-800 px-3 py-1.5 text-sm shadow-card">
          {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
            <option key={m} value={m}>{new Date(2000, m - 1).toLocaleString('en-IN', { month: 'long' })}</option>
          ))}
        </select>
        <select value={year} onChange={(e) => setYear(Number(e.target.value))} className="rounded-lg border-none bg-white dark:bg-slate-800 px-3 py-1.5 text-sm shadow-card">
          {[now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      {canManage && showForm && (
        <form onSubmit={handleSet} className="mt-4 flex flex-wrap items-end gap-2 rounded-xl border border-slate-200 bg-white dark:bg-slate-800 shadow-card transition-shadow hover:shadow-card-hover p-4">
          {needsBranchPicker && (
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-500">Branch</label>
              <select value={form.branchId} onChange={(e) => setForm({ ...form, branchId: e.target.value })} className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-100 transition-colors">
                {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
          )}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-500">Category</label>
            <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-100 transition-colors">
              {CATEGORY_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-500">Budgeted amount</label>
            <input required type="number" value={form.budgetedAmount} onChange={(e) => setForm({ ...form, budgetedAmount: e.target.value })} className="w-32 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-100 transition-colors" />
          </div>
          <p className="text-xs text-slate-400">for {new Date(year, month - 1).toLocaleString('en-IN', { month: 'long', year: 'numeric' })}</p>
          <button type="submit" className="rounded-xl bg-gradient-to-br from-brand-600 to-brand-500 shadow-md shadow-brand-500/25 px-3 py-2 text-sm font-medium text-white hover:opacity-90">Save</button>
        </form>
      )}

      <div className="mt-4 overflow-x-auto bg-white dark:bg-slate-800">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-brand-50/60 text-left text-xs font-semibold uppercase tracking-wide text-brand-700 dark:bg-slate-900/40 dark:text-brand-300">
            <tr>
              {needsBranchPicker && <th className="px-4 py-2">Branch</th>}
              <th className="px-4 py-2">Category</th>
              <th className="px-4 py-2 text-right">Budgeted</th>
              <th className="px-4 py-2 text-right">Actual</th>
              <th className="px-4 py-2 text-right">Variance</th>
              <th className="px-4 py-2">Used</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-slate-100">
                {needsBranchPicker && <td className="px-4 py-2 text-slate-500">{branchName(r.branchId)}</td>}
                <td className="px-4 py-2 font-medium text-slate-800">{r.category}</td>
                <td className="px-4 py-2 text-right">₹{r.budgetedAmount.toLocaleString('en-IN')}</td>
                <td className="px-4 py-2 text-right">₹{r.actualAmount.toLocaleString('en-IN')}</td>
                <td className={`px-4 py-2 text-right ${r.variance < 0 ? 'text-red-600' : 'text-slate-600'}`}>
                  {r.variance < 0 ? '-' : ''}₹{Math.abs(r.variance).toLocaleString('en-IN')}
                </td>
                <td className="px-4 py-2">
                  <span className={`rounded-lg px-2 py-0.5 text-xs font-medium ${r.percentUsed >= 100 ? 'bg-red-100 text-red-700' : r.percentUsed >= 80 ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                    {r.percentUsed}%
                  </span>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={needsBranchPicker ? 6 : 5} className="px-4 py-6 text-center text-slate-400">No budgets set for this period.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}
