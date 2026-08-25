'use client';

import { FormEvent, useEffect, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { useAuth } from '@/lib/auth-context';
import { api, ApiError } from '@/lib/api';
import { Role, RateCardType, type RateCardDTO } from '@holiday-vibez/shared';

const TYPE_OPTIONS = [RateCardType.HOTEL, RateCardType.ACTIVITY, RateCardType.FLIGHT, RateCardType.TRANSFER];

export default function RatesPage() {
  const { user: me } = useAuth();
  const [rates, setRates] = useState<RateCardDTO[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const isAdmin = me?.role === Role.ADMIN;

  const [form, setForm] = useState({
    type: RateCardType.HOTEL as string,
    destination: '',
    name: '',
    baseCost: '',
    taxPct: '',
    currency: 'INR',
  });

  async function load() {
    try {
      setRates(await api.get<RateCardDTO[]>('/rates'));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load rate cards');
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api.post('/rates', {
        ...form,
        baseCost: Number(form.baseCost),
        taxPct: form.taxPct ? Number(form.taxPct) : undefined,
      });
      setForm({ type: RateCardType.HOTEL, destination: '', name: '', baseCost: '', taxPct: '', currency: 'INR' });
      setShowForm(false);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to create rate card. Only Admin can edit rates.');
    }
  }

  async function handleToggleActive(r: RateCardDTO) {
    try {
      await api.patch(`/rates/${r.id}`, { active: !r.active });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to update rate card');
    }
  }

  return (
    <AppShell>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold tracking-tight text-brand-700">Rate Cards</h1>
        {isAdmin && (
          <button
            onClick={() => setShowForm((s) => !s)}
            className="rounded-xl bg-gradient-to-br from-brand-600 to-brand-500 px-3 py-1.5 text-sm font-semibold text-white shadow-md shadow-brand-500/25 transition hover:opacity-90"
          >
            {showForm ? 'Cancel' : 'Add rate'}
          </button>
        )}
      </div>
      {!isAdmin && (
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Read-only — only Admin can create or edit rate cards.</p>
      )}

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      {isAdmin && showForm && (
        <form onSubmit={handleCreate} className="mt-4 grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-white dark:bg-slate-800 shadow-card transition-shadow hover:shadow-card-hover p-4 sm:grid-cols-2 lg:grid-cols-3">
          <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-100 transition-colors">
            {TYPE_OPTIONS.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          <input required placeholder="Destination" value={form.destination} onChange={(e) => setForm({ ...form, destination: e.target.value })} className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-100 transition-colors" />
          <input required placeholder="Name / description" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-100 transition-colors" />
          <input required type="number" placeholder="Base cost" value={form.baseCost} onChange={(e) => setForm({ ...form, baseCost: e.target.value })} className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-100 transition-colors" />
          <input type="number" placeholder="Tax %" value={form.taxPct} onChange={(e) => setForm({ ...form, taxPct: e.target.value })} className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-100 transition-colors" />
          <input placeholder="Currency" value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-100 transition-colors" />
          <button type="submit" className="rounded-xl bg-gradient-to-br from-brand-600 to-brand-500 shadow-md shadow-brand-500/25 px-3 py-2 text-sm font-medium text-white hover:opacity-90 sm:col-span-2 lg:col-span-3">
            Create rate card
          </button>
        </form>
      )}

      <div className="mt-4 overflow-x-auto bg-white dark:bg-slate-800">
        <table className="w-full min-w-[860px] text-sm lg:min-w-0">
          <thead className="bg-brand-50/60 text-left text-xs font-semibold uppercase tracking-wide text-brand-700 dark:bg-slate-900/40 dark:text-brand-300">
            <tr>
              <th className="px-4 py-2">Type</th>
              <th className="px-4 py-2">Destination</th>
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Base cost</th>
              <th className="px-4 py-2">Tax %</th>
              <th className="px-4 py-2">Version</th>
              <th className="px-4 py-2">Status</th>
              {isAdmin && <th className="px-4 py-2 text-right">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {rates.map((r) => (
              <tr key={r.id} className="border-t border-slate-100">
                <td className="px-4 py-2">{r.type}</td>
                <td className="px-4 py-2">{r.destination}</td>
                <td className="px-4 py-2">{r.name}</td>
                <td className="px-4 py-2">{r.currency} {Number(r.baseCost).toLocaleString('en-IN')}</td>
                <td className="px-4 py-2">{r.taxPct}%</td>
                <td className="px-4 py-2">v{r.version}</td>
                <td className="px-4 py-2">
                  <span className={`rounded-lg px-2 py-0.5 text-xs font-medium ${r.active ? 'bg-blue-100 text-blue-700' : 'bg-slate-200 text-slate-600'}`}>
                    {r.active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                {isAdmin && (
                  <td className="px-4 py-2 text-right">
                    <button onClick={() => handleToggleActive(r)} className="text-brand hover:underline">
                      {r.active ? 'Deactivate' : 'Activate'}
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}
