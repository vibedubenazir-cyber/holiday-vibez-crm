'use client';

import { FormEvent, useEffect, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { useAuth } from '@/lib/auth-context';
import { api, ApiError } from '@/lib/api';
import { PettyCashType, Role, type BranchDTO, type PettyCashEntryDTO } from '@holiday-vibez/shared';

export default function PettyCashPage() {
  const { user: me } = useAuth();
  const [entries, setEntries] = useState<PettyCashEntryDTO[]>([]);
  const [balance, setBalance] = useState(0);
  const [branches, setBranches] = useState<BranchDTO[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const needsBranchPicker = me?.role === Role.ADMIN || me?.role === Role.DIRECTOR || me?.role === Role.FINANCE || me?.role === Role.AUDITOR;
  const canManage = me?.role !== Role.AUDITOR;

  const [form, setForm] = useState({
    branchId: '',
    type: PettyCashType.CASH_OUT as string,
    amount: '',
    category: '',
    description: '',
    entryDate: new Date().toISOString().slice(0, 10),
  });

  async function load() {
    try {
      const [e, b, bal] = await Promise.all([
        api.get<PettyCashEntryDTO[]>('/petty-cash'),
        api.get<BranchDTO[]>('/branches'),
        api.get<{ balance: number }>('/petty-cash/balance'),
      ]);
      setEntries(e);
      setBranches(b);
      setBalance(bal.balance);
      if (needsBranchPicker && !form.branchId && b.length) setForm((f) => ({ ...f, branchId: b[0].id }));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load petty cash');
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
      await api.post('/petty-cash', {
        ...form,
        branchId: form.branchId || undefined,
        amount: Number(form.amount),
        category: form.category || undefined,
      });
      setForm({ ...form, amount: '', category: '', description: '' });
      setShowForm(false);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to log petty cash entry');
    }
  }

  return (
    <AppShell>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold tracking-tight text-brand-700">Petty Cash</h1>
        {canManage && (
          <button onClick={() => setShowForm((s) => !s)} className="rounded-xl bg-gradient-to-br from-brand-600 to-brand-500 px-3 py-1.5 text-sm font-semibold text-white shadow-md shadow-brand-500/25 transition hover:opacity-90">
            {showForm ? 'Cancel' : 'Add entry'}
          </button>
        )}
      </div>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Cash-in-hand movements. Current balance: ₹{balance.toLocaleString('en-IN')}</p>
      {!canManage && <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Read-only — auditor access.</p>}

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      {canManage && showForm && (
        <form onSubmit={handleCreate} className="mt-4 flex flex-wrap items-end gap-2 rounded-xl border border-slate-200 bg-white dark:bg-slate-800 shadow-card transition-shadow hover:shadow-card-hover p-4">
          {needsBranchPicker && (
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-500">Branch</label>
              <select value={form.branchId} onChange={(e) => setForm({ ...form, branchId: e.target.value })} className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-100 transition-colors">
                {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
          )}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-500">Type</label>
            <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-100 transition-colors">
              <option value={PettyCashType.CASH_OUT}>Cash out</option>
              <option value={PettyCashType.CASH_IN}>Cash in</option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-500">Amount</label>
            <input required type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className="w-28 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-100 transition-colors" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-500">Category</label>
            <input placeholder="Optional" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="w-32 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-100 transition-colors" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-500">Date</label>
            <input required type="date" value={form.entryDate} onChange={(e) => setForm({ ...form, entryDate: e.target.value })} className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-100 transition-colors" />
          </div>
          <div className="flex flex-1 flex-col gap-1">
            <label className="text-xs font-medium text-slate-500">Description</label>
            <input required value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-100 transition-colors" />
          </div>
          <button type="submit" className="rounded-xl bg-gradient-to-br from-brand-600 to-brand-500 shadow-md shadow-brand-500/25 px-3 py-2 text-sm font-medium text-white hover:opacity-90">Save</button>
        </form>
      )}

      <div className="mt-4 overflow-x-auto bg-white dark:bg-slate-800">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-brand-50/60 text-left text-xs font-semibold uppercase tracking-wide text-brand-700 dark:bg-slate-900/40 dark:text-brand-300">
            <tr>
              <th className="px-4 py-2">Date</th>
              {needsBranchPicker && <th className="px-4 py-2">Branch</th>}
              <th className="px-4 py-2">Type</th>
              <th className="px-4 py-2">Category</th>
              <th className="px-4 py-2">Description</th>
              <th className="px-4 py-2 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e) => (
              <tr key={e.id} className="border-t border-slate-100">
                <td className="px-4 py-2 text-slate-500">{new Date(e.entryDate).toLocaleDateString()}</td>
                {needsBranchPicker && <td className="px-4 py-2 text-slate-500">{branchName(e.branchId)}</td>}
                <td className="px-4 py-2">
                  <span className={`rounded-lg px-2 py-0.5 text-xs font-medium ${e.type === 'CASH_IN' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>
                    {e.type === 'CASH_IN' ? 'Cash in' : 'Cash out'}
                  </span>
                </td>
                <td className="px-4 py-2 text-slate-500">{e.category ?? '—'}</td>
                <td className="px-4 py-2 font-medium text-slate-800">{e.description}</td>
                <td className="px-4 py-2 text-right">₹{e.amount.toLocaleString('en-IN')}</td>
              </tr>
            ))}
            {entries.length === 0 && (
              <tr><td colSpan={needsBranchPicker ? 6 : 5} className="px-4 py-6 text-center text-slate-400">No petty cash entries yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}
