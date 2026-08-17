'use client';

import { FormEvent, useEffect, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { useAuth } from '@/lib/auth-context';
import { api, ApiError } from '@/lib/api';
import { Role, type BranchDTO, type HolidayDTO } from '@holiday-vibez/shared';

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('en-IN', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export default function HolidaysPage() {
  const { user: me } = useAuth();
  const canManage = me?.role === Role.ADMIN || me?.role === Role.DIRECTOR;

  const [holidays, setHolidays] = useState<HolidayDTO[]>([]);
  const [branches, setBranches] = useState<BranchDTO[]>([]);
  const [year, setYear] = useState(new Date().getFullYear());
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', date: '', branchId: '' });
  const [saving, setSaving] = useState(false);

  async function load() {
    try {
      setHolidays(await api.get<HolidayDTO[]>(`/holidays?year=${year}`));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load holidays');
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year]);

  useEffect(() => {
    if (!canManage) return;
    api.get<BranchDTO[]>('/admin/branches').then(setBranches).catch(() => setBranches([]));
  }, [canManage]);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await api.post('/holidays', {
        name: form.name,
        date: form.date,
        branchId: form.branchId || undefined,
      });
      setForm({ name: '', date: '', branchId: '' });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to add holiday');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Remove this holiday?')) return;
    try {
      await api.delete(`/holidays/${id}`);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to remove holiday');
    }
  }

  const today = new Date().toISOString().slice(0, 10);
  const upcoming = holidays.filter((h) => h.date.slice(0, 10) >= today).length;

  return (
    <AppShell>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-brand-700">Holiday Calendar</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Declared holidays don&apos;t consume anyone&apos;s leave quota and aren&apos;t marked absent.
          </p>
        </div>
        <select
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800"
        >
          {[year - 1, year, year + 1].map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </div>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      {canManage && (
        <form
          onSubmit={handleCreate}
          className="mt-4 flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800"
        >
          <label className="text-xs text-slate-500">
            Holiday name
            <input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Diwali"
              className="mt-1 block w-48 rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900"
            />
          </label>
          <label className="text-xs text-slate-500">
            Date
            <input
              required
              type="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              className="mt-1 block rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900"
            />
          </label>
          <label className="text-xs text-slate-500">
            Applies to
            <select
              value={form.branchId}
              onChange={(e) => setForm({ ...form, branchId: e.target.value })}
              className="mt-1 block rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900"
            >
              <option value="">All branches</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} only
                </option>
              ))}
            </select>
          </label>
          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-gradient-to-br from-brand-600 to-brand-500 px-4 py-2 text-sm font-medium text-white shadow-md shadow-brand-500/25 hover:opacity-90 disabled:opacity-60"
          >
            {saving ? 'Adding…' : 'Add Holiday'}
          </button>
        </form>
      )}

      <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
        {holidays.length} holiday{holidays.length === 1 ? '' : 's'} in {year} · {upcoming} still upcoming
      </p>

      <div className="mt-2 overflow-x-auto rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
        <table className="w-full text-sm">
          <thead className="bg-brand-50/60 text-left text-xs font-semibold uppercase tracking-wide text-brand-700 dark:bg-slate-900/40 dark:text-brand-300">
            <tr>
              <th className="px-4 py-2">Date</th>
              <th className="px-4 py-2">Holiday</th>
              <th className="px-4 py-2">Applies to</th>
              {canManage && <th className="px-4 py-2 text-right">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {holidays.map((h) => {
              const past = h.date.slice(0, 10) < today;
              return (
                <tr
                  key={h.id}
                  className={`border-t border-slate-100 dark:border-slate-700 ${past ? 'opacity-50' : ''}`}
                >
                  <td className="whitespace-nowrap px-4 py-2 text-slate-600 dark:text-slate-300">{formatDate(h.date)}</td>
                  <td className="px-4 py-2 font-medium text-slate-800 dark:text-slate-100">{h.name}</td>
                  <td className="px-4 py-2">
                    {h.branch ? (
                      <span className="rounded-lg bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                        {h.branch.name} only
                      </span>
                    ) : (
                      <span className="rounded-lg bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                        All branches
                      </span>
                    )}
                  </td>
                  {canManage && (
                    <td className="px-4 py-2 text-right">
                      <button onClick={() => handleDelete(h.id)} className="text-xs text-red-600 hover:underline">
                        Remove
                      </button>
                    </td>
                  )}
                </tr>
              );
            })}
            {holidays.length === 0 && (
              <tr>
                <td colSpan={canManage ? 4 : 3} className="px-4 py-6 text-center text-slate-400">
                  No holidays declared for {year}.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}
