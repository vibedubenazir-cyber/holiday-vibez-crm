'use client';

import { FormEvent, useEffect, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { useAuth } from '@/lib/auth-context';
import { api, ApiError } from '@/lib/api';
import { ExpenseCategory, Role, type BranchDTO, type ExpenseDTO } from '@holiday-vibez/shared';

const CATEGORY_OPTIONS = [ExpenseCategory.OFFICE, ExpenseCategory.TRAVEL, ExpenseCategory.MARKETING, ExpenseCategory.SALARY, ExpenseCategory.OTHER];

export default function ExpensesPage() {
  const { user: me } = useAuth();
  const [expenses, setExpenses] = useState<ExpenseDTO[]>([]);
  const [summary, setSummary] = useState<{ category: string; total: number }[]>([]);
  const [branches, setBranches] = useState<BranchDTO[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const needsBranchPicker = me?.role === Role.ADMIN || me?.role === Role.DIRECTOR;

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
        api.get<ExpenseDTO[]>('/expenses'),
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
  }, []);

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
        <h1 className="inline-block rounded-lg bg-white px-4 py-2 text-xl font-bold tracking-tight text-brand shadow-card">Accounts & Finance — Expenses</h1>
        <button onClick={() => setShowForm((s) => !s)} className="rounded-lg bg-gradient-to-r from-brand to-brand-500 px-3 py-1.5 text-sm font-medium text-white shadow-card transition-all hover:shadow-card-hover hover:brightness-105">
          {showForm ? 'Cancel' : 'Log expense'}
        </button>
      </div>
      <p className="mt-1 text-sm text-blue-100">Branch Manager sees their own branch; Admin/Director see and log expenses for any branch.</p>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
        {summary.map((s) => (
          <div key={s.category} className="rounded-xl border border-slate-200 bg-white shadow-card transition-shadow hover:shadow-card-hover p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-brand">{s.category}</p>
            <p className="mt-1 text-base font-medium text-slate-800">₹{s.total.toLocaleString('en-IN')}</p>
          </div>
        ))}
        {summary.length === 0 && <p className="col-span-full text-sm text-slate-400">No expenses logged yet.</p>}
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="mt-4 grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-white shadow-card transition-shadow hover:shadow-card-hover p-4 sm:grid-cols-2 lg:grid-cols-3">
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
          <button type="submit" className="rounded-lg bg-brand px-3 py-2 text-sm font-medium text-white hover:bg-brand-dark sm:col-span-2 lg:col-span-3">
            Log expense
          </button>
        </form>
      )}

      <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-card transition-shadow hover:shadow-card-hover">
        <table className="w-full text-sm">
          <thead className="bg-brand-50/60 text-left text-xs font-semibold uppercase tracking-wide text-brand-700">
            <tr>
              <th className="px-4 py-2">Date</th>
              <th className="px-4 py-2">Branch</th>
              <th className="px-4 py-2">Category</th>
              <th className="px-4 py-2">Description</th>
              <th className="px-4 py-2">Amount</th>
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
              </tr>
            ))}
            {expenses.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-6 text-center text-slate-400">No expenses logged yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}
