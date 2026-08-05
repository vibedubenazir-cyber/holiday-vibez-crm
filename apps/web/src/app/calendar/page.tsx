'use client';

import { useEffect, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { api, ApiError } from '@/lib/api';
import type { CalendarEntryDTO } from '@holiday-vibez/shared';

const READINESS_STYLE: Record<string, string> = {
  GREEN: 'border-l-4 border-emerald-500 bg-emerald-50',
  AMBER: 'border-l-4 border-amber-500 bg-amber-50',
  RED: 'border-l-4 border-red-500 bg-red-50',
};

const READINESS_LABEL: Record<string, string> = {
  GREEN: 'Ready',
  AMBER: 'Payment/docs pending',
  RED: 'At risk',
};

export default function CalendarPage() {
  const [entries, setEntries] = useState<CalendarEntryDTO[]>([]);
  const [range, setRange] = useState('30');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<CalendarEntryDTO[]>(`/calendar/departures?range=${range}`)
      .then(setEntries)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Failed to load departure calendar'));
  }, [range]);

  return (
    <AppShell>
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">Departure Calendar</h1>
        <select value={range} onChange={(e) => setRange(e.target.value)} className="rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-100 dark:focus:ring-brand-900/40 transition-colors">
          <option value="7">Next 7 days</option>
          <option value="14">Next 14 days</option>
          <option value="30">Next 30 days</option>
          <option value="90">Next 90 days</option>
        </select>
      </div>
      {error && <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>}

      <div className="mt-4 space-y-2">
        {entries.map((e) => (
          <div key={e.bookingId} className={`flex items-center justify-between rounded-lg p-3 ${READINESS_STYLE[e.readiness]}`}>
            <div>
              <p className="font-medium text-slate-800 dark:text-slate-100">{e.clientName} → {e.destination}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Departs {new Date(e.departureDate).toLocaleDateString()} ({e.daysToDeparture} days) · Docs: {e.docsComplete ? 'complete' : 'pending'} · Payment: {e.paymentComplete ? 'complete' : 'pending'}
              </p>
            </div>
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">{READINESS_LABEL[e.readiness]}</span>
          </div>
        ))}
        {entries.length === 0 && <p className="text-sm text-slate-400 dark:text-slate-500">No departures in this window.</p>}
      </div>
    </AppShell>
  );
}
