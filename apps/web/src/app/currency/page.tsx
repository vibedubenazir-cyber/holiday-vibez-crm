'use client';

import { FormEvent, useEffect, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { useAuth } from '@/lib/auth-context';
import { api, ApiError } from '@/lib/api';
import { Role, type CurrencyRateDTO } from '@holiday-vibez/shared';

export default function CurrencyPage() {
  const { user: me } = useAuth();
  const [rates, setRates] = useState<CurrencyRateDTO[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Record<string, string>>({});
  const isAdmin = me?.role === Role.ADMIN;

  const [form, setForm] = useState({ code: '', rateToInr: '' });

  async function load() {
    try {
      setRates(await api.get<CurrencyRateDTO[]>('/currency/rates'));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load currency rates');
    }
  }

  useEffect(() => {
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, []);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api.post('/currency/rates', { code: form.code, rateToInr: Number(form.rateToInr) });
      setForm({ code: '', rateToInr: '' });
      setShowForm(false);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to add currency. Only Admin can manage currency rates.');
    }
  }

  async function handleSaveEdit(rate: CurrencyRateDTO) {
    const value = editing[rate.id];
    if (value === undefined) return;
    try {
      await api.patch(`/currency/rates/${rate.id}`, { rateToInr: Number(value) });
      const next = { ...editing };
      delete next[rate.id];
      setEditing(next);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to update rate');
    }
  }

  async function handleToggleActive(rate: CurrencyRateDTO) {
    try {
      await api.patch(`/currency/rates/${rate.id}`, { active: !rate.active });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to update rate');
    }
  }

  return (
    <AppShell>
      <div className="flex items-center justify-between">
        <h1 className="inline-block rounded-lg bg-brand px-4 py-2 text-xl font-bold tracking-tight text-white shadow-card">Currency Exchange</h1>
        {isAdmin && (
          <button onClick={() => setShowForm((s) => !s)} className="rounded-lg bg-gradient-to-r from-brand to-brand-500 px-3 py-1.5 text-sm font-medium text-white shadow-card transition-all hover:shadow-card-hover hover:brightness-105">
            {showForm ? 'Cancel' : 'Add currency'}
          </button>
        )}
      </div>
      <p className="mt-1 text-sm text-slate-500">
        Rates against INR. API-sourced rates refresh automatically; manually-edited rates are never overwritten by the automatic feed.
      </p>
      {!isAdmin && <p className="mt-1 text-xs text-slate-400">Read-only — only Admin can manage currency rates.</p>}

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      {isAdmin && showForm && (
        <form onSubmit={handleCreate} className="mt-4 flex gap-2 rounded-xl border border-slate-200 bg-white shadow-card transition-shadow hover:shadow-card-hover p-4">
          <input required placeholder="Code (e.g. CAD)" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} className="w-32 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-100 transition-colors" maxLength={3} />
          <input required type="number" step="0.0001" placeholder="Rate to INR" value={form.rateToInr} onChange={(e) => setForm({ ...form, rateToInr: e.target.value })} className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-100 transition-colors" />
          <button type="submit" className="rounded-lg bg-brand px-3 py-2 text-sm font-medium text-white hover:bg-brand-dark">Add</button>
        </form>
      )}

      <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-card transition-shadow hover:shadow-card-hover">
        <table className="w-full text-sm">
          <thead className="bg-brand-50/60 text-left text-xs font-semibold uppercase tracking-wide text-brand-700">
            <tr>
              <th className="px-4 py-2">Currency</th>
              <th className="px-4 py-2">Rate to INR</th>
              <th className="px-4 py-2">Source</th>
              <th className="px-4 py-2">Last updated</th>
              <th className="px-4 py-2">Status</th>
              {isAdmin && <th className="px-4 py-2 text-right">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {rates.map((r) => (
              <tr key={r.id} className="border-t border-slate-100">
                <td className="px-4 py-2 font-medium text-slate-800">{r.code}</td>
                <td className="px-4 py-2">
                  {isAdmin ? (
                    <input
                      type="number"
                      step="0.0001"
                      value={editing[r.id] ?? r.rateToInr}
                      onChange={(e) => setEditing({ ...editing, [r.id]: e.target.value })}
                      className="w-24 rounded-lg border border-slate-300 px-2 py-1 text-sm"
                    />
                  ) : (
                    `₹${Number(r.rateToInr).toFixed(4)}`
                  )}
                </td>
                <td className="px-4 py-2">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${r.source === 'API' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>
                    {r.source}
                  </span>
                </td>
                <td className="px-4 py-2 text-slate-500">{new Date(r.lastUpdatedAt).toLocaleTimeString()}</td>
                <td className="px-4 py-2">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${r.active ? 'bg-blue-100 text-blue-700' : 'bg-slate-200 text-slate-600'}`}>
                    {r.active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                {isAdmin && (
                  <td className="px-4 py-2 text-right">
                    {editing[r.id] !== undefined && (
                      <button onClick={() => handleSaveEdit(r)} className="mr-3 text-blue-600 hover:underline">Save</button>
                    )}
                    <button onClick={() => handleToggleActive(r)} className="text-brand hover:underline">
                      {r.active ? 'Deactivate' : 'Activate'}
                    </button>
                  </td>
                )}
              </tr>
            ))}
            {rates.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-6 text-center text-slate-400">No currency rates yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}
