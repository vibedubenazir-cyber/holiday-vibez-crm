'use client';

import { FormEvent, useEffect, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { useAuth } from '@/lib/auth-context';
import { api, ApiError } from '@/lib/api';
import { Role, type HotelDTO, type RoomTypeDTO, type MealPlanDTO } from '@holiday-vibez/shared';

type Tab = 'hotels' | 'roomTypes' | 'mealPlans';

function StatusBadge({ active }: { active: boolean }) {
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${active ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' : 'bg-slate-200 text-slate-600 dark:text-slate-300'}`}>
      {active ? 'Active' : 'Inactive'}
    </span>
  );
}

function HotelsTab({ canManage }: { canManage: boolean }) {
  const [items, setItems] = useState<HotelDTO[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', category: '3', destination: '', price: '' });

  async function load() {
    try {
      setItems(await api.get<HotelDTO[]>('/hotels'));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load hotels');
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api.post('/hotels', { name: form.name, category: Number(form.category), destination: form.destination, price: Number(form.price) });
      setForm({ name: '', category: '3', destination: '', price: '' });
      setShowForm(false);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to create hotel');
    }
  }

  async function handleToggleActive(item: HotelDTO) {
    try {
      await api.patch(`/hotels/${item.id}`, { active: !item.active });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to update hotel');
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Hotel</h2>
        {canManage && (
          <button onClick={() => setShowForm((s) => !s)} className="rounded-lg bg-gradient-to-r from-brand to-brand-500 px-3 py-1.5 text-sm font-medium text-white shadow-card transition-all hover:shadow-card-hover hover:brightness-105">
            {showForm ? 'Cancel' : 'Add New'}
          </button>
        )}
      </div>
      {error && <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>}
      {canManage && showForm && (
        <form onSubmit={handleCreate} className="mt-4 grid grid-cols-1 gap-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-card transition-shadow hover:shadow-card-hover p-4 sm:grid-cols-2 lg:grid-cols-4">
          <input required placeholder="Hotel name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-100 dark:focus:ring-brand-900/40 transition-colors" />
          <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-100 dark:focus:ring-brand-900/40 transition-colors">
            {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n} star</option>)}
          </select>
          <input required placeholder="Destination" value={form.destination} onChange={(e) => setForm({ ...form, destination: e.target.value })} className="rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-100 dark:focus:ring-brand-900/40 transition-colors" />
          <input required type="number" min="0" placeholder="Price" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className="rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-100 dark:focus:ring-brand-900/40 transition-colors" />
          <button type="submit" className="rounded-lg bg-brand px-3 py-2 text-sm font-medium text-white hover:bg-brand-dark sm:col-span-2 lg:col-span-4">
            Create
          </button>
        </form>
      )}
      <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-card transition-shadow hover:shadow-card-hover">
        <table className="w-full text-sm">
          <thead className="bg-brand-50/60 dark:bg-slate-900 text-left text-xs font-semibold uppercase tracking-wide text-brand-700 dark:text-slate-400">
            <tr>
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Category</th>
              <th className="px-4 py-2">Destination</th>
              <th className="px-4 py-2">Price</th>
              <th className="px-4 py-2">Status</th>
              {canManage && <th className="px-4 py-2 text-right">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-t border-slate-100 dark:border-slate-800">
                <td className="px-4 py-2 font-medium text-slate-800 dark:text-slate-100">{item.name}</td>
                <td className="px-4 py-2">{'★'.repeat(item.category)}</td>
                <td className="px-4 py-2">{item.destination}</td>
                <td className="px-4 py-2">₹{Number(item.price).toLocaleString('en-IN')}</td>
                <td className="px-4 py-2"><StatusBadge active={item.active} /></td>
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
              <tr><td colSpan={6} className="px-4 py-6 text-center text-slate-400 dark:text-slate-500">No hotels yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SimpleMasterTab({
  label,
  canManage,
  fetchUrl,
}: {
  label: string;
  canManage: boolean;
  fetchUrl: string;
}) {
  const [items, setItems] = useState<(RoomTypeDTO | MealPlanDTO)[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');

  async function load() {
    try {
      setItems(await api.get<(RoomTypeDTO | MealPlanDTO)[]>(fetchUrl));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : `Failed to load ${label.toLowerCase()}`);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchUrl]);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api.post(fetchUrl, { name });
      setName('');
      setShowForm(false);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : `Failed to create ${label.toLowerCase()}`);
    }
  }

  async function handleToggleActive(item: RoomTypeDTO | MealPlanDTO) {
    try {
      await api.patch(`${fetchUrl}/${item.id}`, { active: !item.active });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : `Failed to update ${label.toLowerCase()}`);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">{label}</h2>
        {canManage && (
          <button onClick={() => setShowForm((s) => !s)} className="rounded-lg bg-gradient-to-r from-brand to-brand-500 px-3 py-1.5 text-sm font-medium text-white shadow-card transition-all hover:shadow-card-hover hover:brightness-105">
            {showForm ? 'Cancel' : 'Add New'}
          </button>
        )}
      </div>
      {error && <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>}
      {canManage && showForm && (
        <form onSubmit={handleCreate} className="mt-4 flex gap-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-card transition-shadow hover:shadow-card-hover p-4">
          <input required placeholder={`${label} name`} value={name} onChange={(e) => setName(e.target.value)} className="flex-1 rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-100 dark:focus:ring-brand-900/40 transition-colors" />
          <button type="submit" className="rounded-lg bg-brand px-3 py-2 text-sm font-medium text-white hover:bg-brand-dark">
            Create
          </button>
        </form>
      )}
      <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-card transition-shadow hover:shadow-card-hover">
        <table className="w-full text-sm">
          <thead className="bg-brand-50/60 dark:bg-slate-900 text-left text-xs font-semibold uppercase tracking-wide text-brand-700 dark:text-slate-400">
            <tr>
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Status</th>
              {canManage && <th className="px-4 py-2 text-right">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-t border-slate-100 dark:border-slate-800">
                <td className="px-4 py-2 font-medium text-slate-800 dark:text-slate-100">{item.name}</td>
                <td className="px-4 py-2"><StatusBadge active={item.active} /></td>
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
              <tr><td colSpan={3} className="px-4 py-6 text-center text-slate-400 dark:text-slate-500">No {label.toLowerCase()}s yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function HotelMastersPage() {
  const { user: me } = useAuth();
  const canManage = me?.role === Role.ADMIN || me?.role === Role.DIRECTOR;
  const [tab, setTab] = useState<Tab>('hotels');

  const TABS: { key: Tab; label: string }[] = [
    { key: 'hotels', label: 'Hotel' },
    { key: 'roomTypes', label: 'Room Type' },
    { key: 'mealPlans', label: 'Meal Plan' },
  ];

  return (
    <AppShell>
      <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">Hotel Masters</h1>
      {!canManage && <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">Read-only — only Admin/Director can manage these masters.</p>}

      <div className="mt-4 flex gap-1 border-b border-slate-200 dark:border-slate-700">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium ${tab === t.key ? 'border-b-2 border-brand text-brand' : 'text-slate-500 dark:text-slate-400'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-4">
        {tab === 'hotels' && <HotelsTab canManage={canManage} />}
        {tab === 'roomTypes' && <SimpleMasterTab label="Room Type" canManage={canManage} fetchUrl="/room-types" />}
        {tab === 'mealPlans' && <SimpleMasterTab label="Meal Plan" canManage={canManage} fetchUrl="/meal-plans" />}
      </div>
    </AppShell>
  );
}
