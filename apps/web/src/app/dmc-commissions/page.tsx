'use client';

import { FormEvent, useEffect, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { useAuth } from '@/lib/auth-context';
import { api, ApiError } from '@/lib/api';
import { Role, type DmcCommissionDTO, type SupplierDTO } from '@holiday-vibez/shared';

export default function DmcCommissionsPage() {
  const { user: me } = useAuth();
  const canManage = me?.role !== Role.AUDITOR;
  const [commissions, setCommissions] = useState<DmcCommissionDTO[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierDTO[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'RECEIVED'>('PENDING');

  const [form, setForm] = useState({ supplierId: '', amount: '', tdsAmount: '', notes: '' });

  async function load() {
    try {
      const query = statusFilter === 'ALL' ? '' : `?status=${statusFilter}`;
      const [c, s] = await Promise.all([
        api.get<DmcCommissionDTO[]>(`/dmc-commissions${query}`),
        api.get<SupplierDTO[]>('/suppliers'),
      ]);
      setCommissions(c);
      setSuppliers(s);
      if (!form.supplierId && s.length) setForm((f) => ({ ...f, supplierId: s[0].id }));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load DMC commissions');
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api.post('/dmc-commissions', {
        supplierId: form.supplierId,
        amount: Number(form.amount),
        tdsAmount: form.tdsAmount ? Number(form.tdsAmount) : undefined,
        notes: form.notes || undefined,
      });
      setForm({ ...form, amount: '', tdsAmount: '', notes: '' });
      setShowForm(false);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to record commission');
    }
  }

  async function handleMarkReceived(id: string) {
    try {
      await api.patch(`/dmc-commissions/${id}/received`);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to mark commission received');
    }
  }

  return (
    <AppShell>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold tracking-tight text-brand-700">DMC Commissions</h1>
        {canManage && (
          <button onClick={() => setShowForm((s) => !s)} className="rounded-xl bg-gradient-to-br from-brand-600 to-brand-500 px-3 py-1.5 text-sm font-semibold text-white shadow-md shadow-brand-500/25 transition hover:opacity-90">
            {showForm ? 'Cancel' : 'Record commission'}
          </button>
        )}
      </div>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Commission receivables — money DMCs owe us, separate from what we pay out to them.</p>
      {!canManage && <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Read-only — auditor access.</p>}

      <div className="mt-3 flex gap-2">
        {(['PENDING', 'RECEIVED', 'ALL'] as const).map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium ${statusFilter === s ? 'bg-white dark:bg-slate-800 text-brand shadow-card' : 'text-slate-500 hover:bg-white hover:text-brand dark:text-slate-400 dark:hover:bg-slate-800'}`}
          >
            {s === 'ALL' ? 'All' : s === 'PENDING' ? 'Pending' : 'Received'}
          </button>
        ))}
      </div>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      {canManage && showForm && (
        <form onSubmit={handleCreate} className="mt-4 flex flex-wrap items-end gap-2 rounded-xl border border-slate-200 bg-white dark:bg-slate-800 shadow-card transition-shadow hover:shadow-card-hover p-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-500">DMC / Vendor</label>
            <select value={form.supplierId} onChange={(e) => setForm({ ...form, supplierId: e.target.value })} className="w-48 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-100 transition-colors">
              {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-500">Commission amount</label>
            <input required type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className="w-32 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-100 transition-colors" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-500">TDS withheld</label>
            <input type="number" placeholder="Optional" value={form.tdsAmount} onChange={(e) => setForm({ ...form, tdsAmount: e.target.value })} className="w-28 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-100 transition-colors" />
          </div>
          <div className="flex flex-1 flex-col gap-1">
            <label className="text-xs font-medium text-slate-500">Notes</label>
            <input placeholder="Optional" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-100 transition-colors" />
          </div>
          <button type="submit" className="rounded-xl bg-gradient-to-br from-brand-600 to-brand-500 shadow-md shadow-brand-500/25 px-3 py-2 text-sm font-medium text-white hover:opacity-90">Save</button>
        </form>
      )}

      <div className="mt-4 overflow-hidden bg-white dark:bg-slate-800">
        <table className="w-full text-sm">
          <thead className="bg-brand-50/60 text-left text-xs font-semibold uppercase tracking-wide text-brand-700 dark:bg-slate-900/40 dark:text-brand-300">
            <tr>
              <th className="px-4 py-2">DMC / Vendor</th>
              <th className="px-4 py-2 text-right">Amount</th>
              <th className="px-4 py-2 text-right">TDS</th>
              <th className="px-4 py-2">Notes</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {commissions.map((c) => (
              <tr key={c.id} className="border-t border-slate-100">
                <td className="px-4 py-2 font-medium text-slate-800">{c.supplier?.name ?? c.supplierId}</td>
                <td className="px-4 py-2 text-right">₹{c.amount.toLocaleString('en-IN')}</td>
                <td className="px-4 py-2 text-right text-slate-500">{c.tdsAmount > 0 ? `₹${c.tdsAmount.toLocaleString('en-IN')}` : '—'}</td>
                <td className="px-4 py-2 text-slate-500">{c.notes ?? '—'}</td>
                <td className="px-4 py-2">
                  <span className={`rounded-lg px-2 py-0.5 text-xs font-medium ${c.status === 'RECEIVED' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>
                    {c.status === 'RECEIVED' ? `Received ${c.receivedAt ? new Date(c.receivedAt).toLocaleDateString() : ''}` : 'Pending'}
                  </span>
                </td>
                <td className="px-4 py-2 text-right">
                  {canManage && c.status === 'PENDING' && (
                    <button onClick={() => handleMarkReceived(c.id)} className="text-brand hover:underline">Mark received</button>
                  )}
                </td>
              </tr>
            ))}
            {commissions.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-6 text-center text-slate-400">No commissions recorded yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}
