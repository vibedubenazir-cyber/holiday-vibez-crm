'use client';

import { FormEvent, useEffect, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { useAuth } from '@/lib/auth-context';
import { api, ApiError } from '@/lib/api';
import { BankTransactionType, Role, type BankTransactionDTO, type BranchDTO, type PaymentDTO } from '@holiday-vibez/shared';

export default function BankReconciliationPage() {
  const { user: me } = useAuth();
  const [txns, setTxns] = useState<BankTransactionDTO[]>([]);
  const [payments, setPayments] = useState<PaymentDTO[]>([]);
  const [branches, setBranches] = useState<BranchDTO[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [matchSelections, setMatchSelections] = useState<Record<string, string>>({});
  const needsBranchPicker = me?.role === Role.ADMIN || me?.role === Role.DIRECTOR || me?.role === Role.FINANCE || me?.role === Role.AUDITOR;
  const canManage = me?.role !== Role.AUDITOR;

  const [form, setForm] = useState({
    branchId: '',
    transactionDate: new Date().toISOString().slice(0, 10),
    description: '',
    amount: '',
    type: BankTransactionType.CREDIT as string,
  });

  async function load() {
    try {
      const [t, p, b] = await Promise.all([
        api.get<BankTransactionDTO[]>('/bank-transactions'),
        api.get<PaymentDTO[]>('/payments'),
        api.get<BranchDTO[]>('/branches'),
      ]);
      setTxns(t);
      setPayments(p);
      setBranches(b);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load bank transactions');
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api.post('/bank-transactions', { ...form, branchId: form.branchId || undefined, amount: Number(form.amount) });
      setForm({ ...form, amount: '', description: '' });
      setShowForm(false);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to add bank transaction');
    }
  }

  async function handleMatch(txnId: string) {
    const paymentId = matchSelections[txnId];
    if (!paymentId) return;
    try {
      await api.patch(`/bank-transactions/${txnId}/match`, { paymentId });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to match transaction');
    }
  }

  async function handleUnmatch(txnId: string) {
    try {
      await api.patch(`/bank-transactions/${txnId}/unmatch`);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to unmatch transaction');
    }
  }

  const unmatchedPayments = payments.filter((p) => !txns.some((t) => t.matched && t.matchedPaymentId === p.id));

  return (
    <AppShell>
      <div className="flex items-center justify-between">
        <h1 className="inline-block rounded-lg bg-brand-50 px-4 py-2 text-xl font-bold tracking-tight text-brand shadow-card">Bank Reconciliation</h1>
        {canManage && (
          <button onClick={() => setShowForm((s) => !s)} className="rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-brand-700">
            {showForm ? 'Cancel' : 'Add bank line'}
          </button>
        )}
      </div>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Key in each bank statement line, then match it against the corresponding payment.</p>
      {!canManage && <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Read-only — auditor access.</p>}

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      {canManage && showForm && (
        <form onSubmit={handleCreate} className="mt-4 flex flex-wrap items-end gap-2 rounded-xl border border-slate-200 bg-white dark:bg-slate-800 shadow-card transition-shadow hover:shadow-card-hover p-4">
          {needsBranchPicker && (
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-500">Branch</label>
              <select value={form.branchId} onChange={(e) => setForm({ ...form, branchId: e.target.value })} className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-100 transition-colors">
                <option value="">Unassigned</option>
                {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
          )}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-500">Date</label>
            <input required type="date" value={form.transactionDate} onChange={(e) => setForm({ ...form, transactionDate: e.target.value })} className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-100 transition-colors" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-500">Type</label>
            <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-100 transition-colors">
              <option value={BankTransactionType.CREDIT}>Credit</option>
              <option value={BankTransactionType.DEBIT}>Debit</option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-500">Amount</label>
            <input required type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className="w-28 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-100 transition-colors" />
          </div>
          <div className="flex flex-1 flex-col gap-1">
            <label className="text-xs font-medium text-slate-500">Description</label>
            <input required value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-100 transition-colors" />
          </div>
          <button type="submit" className="rounded-lg bg-brand px-3 py-2 text-sm font-medium text-white hover:bg-brand-dark">Save</button>
        </form>
      )}

      <div className="mt-4 overflow-hidden bg-white dark:bg-slate-800">
        <table className="w-full text-sm">
          <thead className="bg-brand-50/60 text-left text-xs font-semibold uppercase tracking-wide text-brand-700 dark:bg-slate-900/40 dark:text-brand-300">
            <tr>
              <th className="px-4 py-2">Date</th>
              <th className="px-4 py-2">Description</th>
              <th className="px-4 py-2">Type</th>
              <th className="px-4 py-2 text-right">Amount</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2 text-right">Match</th>
            </tr>
          </thead>
          <tbody>
            {txns.map((t) => (
              <tr key={t.id} className="border-t border-slate-100">
                <td className="px-4 py-2 text-slate-500">{new Date(t.transactionDate).toLocaleDateString()}</td>
                <td className="px-4 py-2 font-medium text-slate-800">{t.description}</td>
                <td className="px-4 py-2">
                  <span className={`rounded-lg px-2 py-0.5 text-xs font-medium ${t.type === 'CREDIT' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>{t.type}</span>
                </td>
                <td className="px-4 py-2 text-right">₹{t.amount.toLocaleString('en-IN')}</td>
                <td className="px-4 py-2">
                  <span className={`rounded-lg px-2 py-0.5 text-xs font-medium ${t.matched ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>
                    {t.matched ? 'Matched' : 'Unmatched'}
                  </span>
                </td>
                <td className="px-4 py-2 text-right">
                  {!canManage ? (
                    <span className="text-slate-400">—</span>
                  ) : t.matched ? (
                    <button onClick={() => handleUnmatch(t.id)} className="text-brand hover:underline">Unmatch</button>
                  ) : (
                    <div className="flex items-center justify-end gap-2">
                      <select value={matchSelections[t.id] ?? ''} onChange={(e) => setMatchSelections({ ...matchSelections, [t.id]: e.target.value })} className="rounded-lg border border-slate-300 px-2 py-1 text-xs">
                        <option value="">Select payment…</option>
                        {unmatchedPayments.map((p) => (
                          <option key={p.id} value={p.id}>{p.type.replaceAll('_', ' ')} · ₹{p.amount.toLocaleString('en-IN')}</option>
                        ))}
                      </select>
                      <button onClick={() => handleMatch(t.id)} disabled={!matchSelections[t.id]} className="text-brand hover:underline disabled:opacity-40">Match</button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {txns.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-6 text-center text-slate-400">No bank transactions logged yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}
