'use client';

import { FormEvent, useEffect, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { useAuth } from '@/lib/auth-context';
import { api, ApiError } from '@/lib/api';
import { Role, type DayItineraryDTO } from '@holiday-vibez/shared';

export default function DayItinerariesPage() {
  const { user: me } = useAuth();
  const [items, setItems] = useState<DayItineraryDTO[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const canManage = me?.role === Role.ADMIN || me?.role === Role.DIRECTOR;

  const [form, setForm] = useState({ title: '', detail: '' });

  async function load() {
    try {
      setItems(await api.get<DayItineraryDTO[]>('/day-itineraries'));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load day itineraries');
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api.post('/day-itineraries', form);
      setForm({ title: '', detail: '' });
      setShowForm(false);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to create day itinerary. Only Admin/Director can manage this.');
    }
  }

  async function handleToggleActive(item: DayItineraryDTO) {
    try {
      await api.patch(`/day-itineraries/${item.id}`, { active: !item.active });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to update day itinerary');
    }
  }

  return (
    <AppShell>
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">Day Itinerary</h1>
        {canManage && (
          <button onClick={() => setShowForm((s) => !s)} className="rounded-lg bg-gradient-to-r from-brand to-brand-500 px-3 py-1.5 text-sm font-medium text-white shadow-card transition-all hover:shadow-card-hover hover:brightness-105">
            {showForm ? 'Cancel' : 'Add New'}
          </button>
        )}
      </div>
      {!canManage && <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">Read-only — only Admin/Director can manage day itineraries.</p>}

      {error && <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>}

      {canManage && showForm && (
        <form onSubmit={handleCreate} className="mt-4 grid grid-cols-1 gap-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-card transition-shadow hover:shadow-card-hover p-4">
          <input required placeholder="Title (e.g. Thekkady – Kochi Drop: (170KM – HRS))" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-100 dark:focus:ring-brand-900/40 transition-colors" />
          <textarea required placeholder="Detail" rows={4} value={form.detail} onChange={(e) => setForm({ ...form, detail: e.target.value })} className="rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-100 dark:focus:ring-brand-900/40 transition-colors" />
          <button type="submit" className="rounded-lg bg-brand px-3 py-2 text-sm font-medium text-white hover:bg-brand-dark">
            Create
          </button>
        </form>
      )}

      <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-card transition-shadow hover:shadow-card-hover">
        <table className="w-full text-sm">
          <thead className="bg-brand-50/60 dark:bg-slate-900 text-left text-xs font-semibold uppercase tracking-wide text-brand-700 dark:text-slate-400">
            <tr>
              <th className="px-4 py-2">Title</th>
              <th className="px-4 py-2">Detail</th>
              <th className="px-4 py-2">Status</th>
              {canManage && <th className="px-4 py-2 text-right">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-t border-slate-100 dark:border-slate-800">
                <td className="px-4 py-2 font-medium text-slate-800 dark:text-slate-100">{item.title}</td>
                <td className="px-4 py-2 max-w-xl truncate text-slate-500 dark:text-slate-400">{item.detail}</td>
                <td className="px-4 py-2">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${item.active ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' : 'bg-slate-200 text-slate-600 dark:text-slate-300'}`}>
                    {item.active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                {canManage && (
                  <td className="px-4 py-2 text-right">
                    <button onClick={() => handleToggleActive(item)} className="text-brand hover:underline">
                      {item.active ? 'Deactivate' : 'Activate'}
                    </button>
                  </td>
                )}
              </tr>
            ))}
            {items.length === 0 && (
              <tr><td colSpan={4} className="px-4 py-6 text-center text-slate-400 dark:text-slate-500">No day itineraries yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}
