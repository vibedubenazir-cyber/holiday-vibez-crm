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

  function getLocation(): Promise<{ lat?: number; lng?: number }> {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve({});
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => resolve({}),
        { timeout: 5000 },
      );
    });
  }

  async function handleClockIn() {
    setError(null);
    try {
      const { lat, lng } = await getLocation();
      await api.post('/attendance/clock-in', { lat, lng });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to clock in');
    }
  }

  async function handleClockOut() {
    setError(null);
    try {
      const { lat, lng } = await getLocation();
      await api.post('/attendance/clock-out', { lat, lng });
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
      <h1 className="inline-block rounded-lg bg-white px-4 py-2 text-xl font-bold tracking-tight text-brand shadow-card">Attendance</h1>
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      <div className="mt-4 rounded-xl border border-slate-200 bg-white shadow-card transition-shadow hover:shadow-card-hover p-4">
        <p className="text-sm font-medium text-slate-800">Today</p>
        {today ? (
          <p className="mt-1 text-sm text-slate-500">
            Checked in {new Date(today.checkInAt!).toLocaleTimeString()}
            {today.checkInLat != null && <span className="ml-1 text-xs text-blue-600">(location recorded)</span>}
            {today.checkOutAt ? ` · Checked out ${new Date(today.checkOutAt).toLocaleTimeString()}` : ' · Still clocked in'}
          </p>
        ) : (
          <p className="mt-1 text-sm text-slate-500">Not clocked in yet today.</p>
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
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-100 transition-colors font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-40"
          >
            Clock out
          </button>
        </div>
      </div>

      {canSeeTeam && (
        <div className="mt-4 overflow-hidden bg-white">
          <div className="border-b border-slate-100 px-4 py-2 text-sm font-medium text-slate-800">Team attendance — this month</div>
          <table className="w-full text-sm">
            <thead className="bg-brand-50/60 text-left text-xs font-semibold uppercase tracking-wide text-brand-700">
              <tr>
                <th className="px-4 py-2">Name</th>
                <th className="px-4 py-2">Date</th>
                <th className="px-4 py-2">Check in</th>
                <th className="px-4 py-2">Check out</th>
                <th className="px-4 py-2">Hours</th>
                <th className="px-4 py-2">Location</th>
                <th className="px-4 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {team.map((a) => (
                <tr key={a.id} className="border-t border-slate-100">
                  <td className="px-4 py-2">{a.user?.name}</td>
                  <td className="px-4 py-2">{new Date(a.date).toLocaleDateString()}</td>
                  <td className="px-4 py-2">{a.checkInAt ? new Date(a.checkInAt).toLocaleTimeString() : '—'}</td>
                  <td className="px-4 py-2">{a.checkOutAt ? new Date(a.checkOutAt).toLocaleTimeString() : '—'}</td>
                  <td className="px-4 py-2">{hoursWorked(a)}</td>
                  <td className="px-4 py-2 text-xs text-slate-500">
                    {a.checkInLat != null ? (
                      <a
                        href={`https://www.google.com/maps?q=${a.checkInLat},${a.checkInLng}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-brand hover:underline"
                      >
                        View
                      </a>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="px-4 py-2">{a.status}</td>
                </tr>
              ))}
              {team.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-6 text-center text-slate-400">No attendance records this month.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </AppShell>
  );
}
