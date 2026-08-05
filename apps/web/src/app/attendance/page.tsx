'use client';

import { useEffect, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { useAuth } from '@/lib/auth-context';
import { api, ApiError } from '@/lib/api';
import { Role, type AttendanceDTO } from '@holiday-vibez/shared';

export default function AttendancePage() {
  const { user: me } = useAuth();
  const [today, setToday] = useState<AttendanceDTO | null>(null);
  const [team, setTeam] = useState<AttendanceDTO[]>([]);
  const [error, setError] = useState<string | null>(null);
  const canSeeTeam = me?.role === Role.ADMIN || me?.role === Role.DIRECTOR || me?.role === Role.BRANCH_MANAGER;

  async function load() {
    try {
      const todayRes = await api.get<AttendanceDTO | null>('/attendance/me/today');
      setToday(todayRes);
      if (canSeeTeam) {
        setTeam(await api.get<AttendanceDTO[]>(`/attendance?month=${new Date().toISOString().slice(0, 7)}`));
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load attendance');
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleClockIn() {
    setError(null);
    try {
      await api.post('/attendance/clock-in');
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to clock in');
    }
  }

  async function handleClockOut() {
    setError(null);
    try {
      await api.post('/attendance/clock-out');
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to clock out');
    }
  }

  function hoursWorked(a: AttendanceDTO) {
    if (!a.checkInAt || !a.checkOutAt) return '—';
    const hrs = (new Date(a.checkOutAt).getTime() - new Date(a.checkInAt).getTime()) / 3600000;
    return `${hrs.toFixed(1)}h`;
  }

  return (
    <AppShell>
      <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">Attendance</h1>
      {error && <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>}

      <div className="mt-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-card transition-shadow hover:shadow-card-hover p-4">
        <p className="text-sm font-medium text-slate-800 dark:text-slate-100">Today</p>
        {today ? (
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Checked in {new Date(today.checkInAt!).toLocaleTimeString()}
            {today.checkOutAt ? ` · Checked out ${new Date(today.checkOutAt).toLocaleTimeString()}` : ' · Still clocked in'}
          </p>
        ) : (
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Not clocked in yet today.</p>
        )}
        <div className="mt-3 flex gap-2">
          <button
            onClick={handleClockIn}
            disabled={!!today}
            className="rounded-lg bg-brand px-3 py-2 text-sm font-medium text-white hover:bg-brand-dark disabled:opacity-40"
          >
            Clock in
          </button>
          <button
            onClick={handleClockOut}
            disabled={!today || !!today.checkOutAt}
            className="rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-100 dark:focus:ring-brand-900/40 transition-colors font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40"
          >
            Clock out
          </button>
        </div>
      </div>

      {canSeeTeam && (
        <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-card transition-shadow hover:shadow-card-hover">
          <div className="border-b border-slate-100 dark:border-slate-800 px-4 py-2 text-sm font-medium text-slate-800 dark:text-slate-100">Team attendance — this month</div>
          <table className="w-full text-sm">
            <thead className="bg-brand-50/60 dark:bg-slate-900 text-left text-xs font-semibold uppercase tracking-wide text-brand-700 dark:text-slate-400">
              <tr>
                <th className="px-4 py-2">Name</th>
                <th className="px-4 py-2">Date</th>
                <th className="px-4 py-2">Check in</th>
                <th className="px-4 py-2">Check out</th>
                <th className="px-4 py-2">Hours</th>
                <th className="px-4 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {team.map((a) => (
                <tr key={a.id} className="border-t border-slate-100 dark:border-slate-800">
                  <td className="px-4 py-2">{a.user?.name}</td>
                  <td className="px-4 py-2">{new Date(a.date).toLocaleDateString()}</td>
                  <td className="px-4 py-2">{a.checkInAt ? new Date(a.checkInAt).toLocaleTimeString() : '—'}</td>
                  <td className="px-4 py-2">{a.checkOutAt ? new Date(a.checkOutAt).toLocaleTimeString() : '—'}</td>
                  <td className="px-4 py-2">{hoursWorked(a)}</td>
                  <td className="px-4 py-2">{a.status}</td>
                </tr>
              ))}
              {team.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-6 text-center text-slate-400 dark:text-slate-500">No attendance records this month.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </AppShell>
  );
}
