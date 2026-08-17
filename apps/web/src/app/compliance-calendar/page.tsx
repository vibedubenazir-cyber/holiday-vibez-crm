'use client';

import { useEffect, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { useAuth } from '@/lib/auth-context';
import { api, ApiError } from '@/lib/api';
import { Role, type ComplianceCalendarRowDTO } from '@holiday-vibez/shared';

const TYPE_STYLES: Record<string, string> = {
  PROBATION_END: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  EXIT: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
};

const TYPE_LABEL: Record<string, string> = {
  PROBATION_END: 'Probation ending',
  EXIT: 'Last working day',
};

const WINDOWS = [30, 60, 90];

export default function ComplianceCalendarPage() {
  const { user: me } = useAuth();
  const canView = me?.role === Role.ADMIN || me?.role === Role.DIRECTOR || me?.role === Role.BRANCH_MANAGER;
  const [rows, setRows] = useState<ComplianceCalendarRowDTO[]>([]);
  const [days, setDays] = useState(60);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      setRows(await api.get<ComplianceCalendarRowDTO[]>(`/compliance/calendar?days=${days}`));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load compliance calendar');
    }
  }

  useEffect(() => {
    if (canView) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days, canView]);

  if (!canView) {
    return (
      <AppShell>
        <h1 className="text-2xl font-extrabold tracking-tight text-brand-700">Compliance Calendar</h1>
        <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">Only Director, Admin, and Branch Manager can view the compliance calendar.</p>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold tracking-tight text-brand-700">Compliance Calendar</h1>
        <div className="flex gap-1 rounded-lg border border-slate-200 bg-white dark:bg-slate-800 dark:border-slate-700 p-1 text-sm">
          {WINDOWS.map((w) => (
            <button
              key={w}
              onClick={() => setDays(w)}
              className={`rounded px-3 py-1.5 font-medium ${days === w ? 'bg-brand text-white' : 'text-slate-600 dark:text-slate-300'}`}
            >
              {w}d
            </button>
          ))}
        </div>
      </div>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        Upcoming probation-end dates and confirmed last-working-days over the next {days} days{me?.role === Role.BRANCH_MANAGER ? ' for your branch' : ''}.
      </p>
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white dark:bg-slate-800 dark:border-slate-700 shadow-card">
        <table className="w-full text-sm">
          <thead className="bg-brand-50/60 text-left text-xs font-semibold uppercase tracking-wide text-brand-700 dark:bg-slate-900/40 dark:text-brand-300">
            <tr>
              <th className="px-4 py-2">Date</th>
              <th className="px-4 py-2">Employee</th>
              <th className="px-4 py-2">Branch</th>
              <th className="px-4 py-2">Event</th>
              <th className="px-4 py-2">Detail</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-t border-slate-100 dark:border-slate-700">
                <td className="px-4 py-2 font-medium text-slate-800 dark:text-slate-100">{new Date(r.date).toLocaleDateString()}</td>
                <td className="px-4 py-2 text-slate-700 dark:text-slate-200">{r.userName}</td>
                <td className="px-4 py-2 text-slate-500 dark:text-slate-400">{r.branchName ?? '—'}</td>
                <td className="px-4 py-2">
                  <span className={`rounded-lg px-2 py-0.5 text-xs font-medium ${TYPE_STYLES[r.type]}`}>{TYPE_LABEL[r.type]}</span>
                </td>
                <td className="px-4 py-2 text-slate-500 dark:text-slate-400">{r.detail}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-6 text-center text-slate-400">Nothing coming up in the next {days} days.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}
