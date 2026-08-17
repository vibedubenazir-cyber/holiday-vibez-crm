'use client';

import { FormEvent, useEffect, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { useAuth } from '@/lib/auth-context';
import { api, ApiError } from '@/lib/api';
import { PerformanceRating, Role, type EmployeeDTO, type PerformanceReviewDTO } from '@holiday-vibez/shared';

const RATING_OPTIONS = [
  PerformanceRating.NEEDS_IMPROVEMENT,
  PerformanceRating.MEETS_EXPECTATIONS,
  PerformanceRating.EXCEEDS_EXPECTATIONS,
  PerformanceRating.OUTSTANDING,
];
const RATING_LABELS: Record<string, string> = {
  NEEDS_IMPROVEMENT: 'Needs improvement',
  MEETS_EXPECTATIONS: 'Meets expectations',
  EXCEEDS_EXPECTATIONS: 'Exceeds expectations',
  OUTSTANDING: 'Outstanding',
};
const STATUS_STYLES: Record<string, string> = {
  DRAFT: 'bg-slate-100 text-slate-600',
  SUBMITTED: 'bg-amber-100 text-amber-700',
  ACKNOWLEDGED: 'bg-emerald-100 text-emerald-700',
};

export default function PerformancePage() {
  const { user: me } = useAuth();
  const isReviewer = me?.role === Role.ADMIN || me?.role === Role.DIRECTOR || me?.role === Role.BRANCH_MANAGER;

  const [mine, setMine] = useState<PerformanceReviewDTO[]>([]);
  const [given, setGiven] = useState<PerformanceReviewDTO[]>([]);
  const [employees, setEmployees] = useState<EmployeeDTO[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ userId: '', period: '', rating: '' as string, strengths: '', improvements: '', goals: '' });

  async function load() {
    try {
      setMine(await api.get<PerformanceReviewDTO[]>('/performance/me'));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load your reviews');
    }
    if (isReviewer) {
      try {
        const [g, e] = await Promise.all([
          api.get<PerformanceReviewDTO[]>('/performance/given'),
          api.get<EmployeeDTO[]>('/employees'),
        ]);
        setGiven(g);
        setEmployees(me?.role === Role.BRANCH_MANAGER ? e.filter((emp) => emp.branchId === me.branchId) : e);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'Failed to load reviews you have given');
      }
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me?.role]);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api.post('/performance', { ...form, rating: form.rating || undefined });
      setForm({ userId: '', period: '', rating: '', strengths: '', improvements: '', goals: '' });
      setShowForm(false);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to create review');
    }
  }

  async function handleSubmit(id: string) {
    try {
      await api.post(`/performance/${id}/submit`, {});
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to submit review');
    }
  }

  async function handleAcknowledge(id: string) {
    try {
      await api.post(`/performance/${id}/acknowledge`, {});
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to acknowledge review');
    }
  }

  return (
    <AppShell>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold tracking-tight text-brand-700">Performance</h1>
        {isReviewer && (
          <button onClick={() => setShowForm((s) => !s)} className="rounded-xl bg-gradient-to-br from-brand-600 to-brand-500 px-3 py-1.5 text-sm font-semibold text-white shadow-md shadow-brand-500/25 transition hover:opacity-90">
            {showForm ? 'Cancel' : 'New review'}
          </button>
        )}
      </div>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Reviews are drafted privately, then submitted for the employee to see and acknowledge.</p>
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      {isReviewer && showForm && (
        <form onSubmit={handleCreate} className="mt-4 grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-card dark:border-slate-700 dark:bg-slate-800 sm:grid-cols-2">
          <select required value={form.userId} onChange={(e) => setForm({ ...form, userId: e.target.value })} className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none dark:border-slate-600 dark:bg-slate-900">
            <option value="">Select employee</option>
            {employees.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
          </select>
          <input required placeholder="Period (e.g. 2026-Q3)" value={form.period} onChange={(e) => setForm({ ...form, period: e.target.value })} className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none dark:border-slate-600 dark:bg-slate-900" />
          <select value={form.rating} onChange={(e) => setForm({ ...form, rating: e.target.value })} className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none dark:border-slate-600 dark:bg-slate-900 sm:col-span-2">
            <option value="">Rating (optional)</option>
            {RATING_OPTIONS.map((r) => <option key={r} value={r}>{RATING_LABELS[r]}</option>)}
          </select>
          <textarea placeholder="Strengths" value={form.strengths} onChange={(e) => setForm({ ...form, strengths: e.target.value })} className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none dark:border-slate-600 dark:bg-slate-900 sm:col-span-2" rows={2} />
          <textarea placeholder="Areas for improvement" value={form.improvements} onChange={(e) => setForm({ ...form, improvements: e.target.value })} className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none dark:border-slate-600 dark:bg-slate-900 sm:col-span-2" rows={2} />
          <textarea placeholder="Goals for next period" value={form.goals} onChange={(e) => setForm({ ...form, goals: e.target.value })} className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none dark:border-slate-600 dark:bg-slate-900 sm:col-span-2" rows={2} />
          <button type="submit" className="rounded-xl bg-gradient-to-br from-brand-600 to-brand-500 shadow-md shadow-brand-500/25 px-3 py-2 text-sm font-medium text-white hover:opacity-90 sm:col-span-2">Save as draft</button>
        </form>
      )}

      <p className="mt-6 text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">My Reviews</p>
      <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {mine.map((r) => (
          <div key={r.id} className="rounded-lg bg-white p-4 shadow-card dark:bg-slate-800">
            <div className="flex items-center justify-between">
              <p className="font-medium text-slate-800 dark:text-slate-100">{r.period}</p>
              <span className={`rounded-lg px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[r.status]}`}>{r.status}</span>
            </div>
            {r.rating && <p className="mt-1 text-sm text-brand">{RATING_LABELS[r.rating]}</p>}
            {r.strengths && <p className="mt-2 text-sm text-slate-600 dark:text-slate-300"><span className="font-medium">Strengths:</span> {r.strengths}</p>}
            {r.improvements && <p className="mt-1 text-sm text-slate-600 dark:text-slate-300"><span className="font-medium">To improve:</span> {r.improvements}</p>}
            {r.goals && <p className="mt-1 text-sm text-slate-600 dark:text-slate-300"><span className="font-medium">Goals:</span> {r.goals}</p>}
            <p className="mt-2 text-xs text-slate-400">By {r.reviewer?.name}</p>
            {r.status === 'SUBMITTED' && (
              <button onClick={() => handleAcknowledge(r.id)} className="mt-2 rounded-xl bg-gradient-to-br from-brand-600 to-brand-500 shadow-md shadow-brand-500/25 px-3 py-1.5 text-xs font-medium text-white hover:opacity-90">Acknowledge</button>
            )}
          </div>
        ))}
        {mine.length === 0 && <p className="text-sm text-slate-400">No reviews yet.</p>}
      </div>

      {isReviewer && (
        <>
          <p className="mt-6 text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Reviews I&apos;ve Given</p>
          <div className="mt-2 overflow-hidden bg-white dark:bg-slate-800">
            <table className="w-full text-sm">
              <thead className="bg-brand-50/60 text-left text-xs font-semibold uppercase tracking-wide text-brand-700 dark:bg-slate-900/40 dark:text-brand-300">
                <tr>
                  <th className="px-4 py-2">Employee</th>
                  <th className="px-4 py-2">Period</th>
                  <th className="px-4 py-2">Rating</th>
                  <th className="px-4 py-2">Status</th>
                  <th className="px-4 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {given.map((r) => (
                  <tr key={r.id} className="border-t border-slate-100 dark:border-slate-700">
                    <td className="px-4 py-2 font-medium text-slate-800 dark:text-slate-100">{r.user?.name}</td>
                    <td className="px-4 py-2 text-slate-500 dark:text-slate-400">{r.period}</td>
                    <td className="px-4 py-2 text-slate-500 dark:text-slate-400">{r.rating ? RATING_LABELS[r.rating] : '—'}</td>
                    <td className="px-4 py-2">
                      <span className={`rounded-lg px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[r.status]}`}>{r.status}</span>
                    </td>
                    <td className="px-4 py-2 text-right">
                      {r.status === 'DRAFT' && (
                        <button onClick={() => handleSubmit(r.id)} className="text-brand hover:underline">Submit</button>
                      )}
                    </td>
                  </tr>
                ))}
                {given.length === 0 && (
                  <tr><td colSpan={5} className="px-4 py-6 text-center text-slate-400">No reviews given yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </AppShell>
  );
}
