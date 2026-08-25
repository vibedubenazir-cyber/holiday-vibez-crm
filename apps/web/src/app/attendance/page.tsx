'use client';

import { FormEvent, useEffect, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { useAuth } from '@/lib/auth-context';
import { api, ApiError } from '@/lib/api';
import { Role, type AttendanceDTO, type AttendanceRegularisationDTO } from '@holiday-vibez/shared';

const REG_STATUS_STYLES: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-700',
  APPROVED: 'bg-emerald-100 text-emerald-700',
  REJECTED: 'bg-red-100 text-red-700',
};

export default function AttendancePage() {
  const { user: me } = useAuth();
  const [today, setToday] = useState<AttendanceDTO | null>(null);
  const [team, setTeam] = useState<AttendanceDTO[]>([]);
  const [myRegs, setMyRegs] = useState<AttendanceRegularisationDTO[]>([]);
  const [pendingRegs, setPendingRegs] = useState<AttendanceRegularisationDTO[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showRegForm, setShowRegForm] = useState(false);
  const [regForm, setRegForm] = useState({ date: '', checkIn: '', checkOut: '', reason: '' });
  const canSeeTeam = me?.role === Role.ADMIN || me?.role === Role.DIRECTOR || me?.role === Role.BRANCH_MANAGER;

  async function load() {
    try {
      const todayRes = await api.get<AttendanceDTO | null>('/attendance/me/today');
      setToday(todayRes);
      if (canSeeTeam) {
        setTeam(await api.get<AttendanceDTO[]>(`/attendance?month=${new Date().toISOString().slice(0, 7)}`));
        setPendingRegs(await api.get<AttendanceRegularisationDTO[]>('/attendance/regularisations?status=PENDING'));
      }
      setMyRegs(await api.get<AttendanceRegularisationDTO[]>('/attendance/regularisations/me'));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load attendance');
    }
  }

  async function handleRegularise(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api.post('/attendance/regularisations', {
        date: regForm.date,
        requestedCheckInAt: regForm.checkIn ? `${regForm.date}T${regForm.checkIn}:00` : undefined,
        requestedCheckOutAt: regForm.checkOut ? `${regForm.date}T${regForm.checkOut}:00` : undefined,
        reason: regForm.reason,
      });
      setRegForm({ date: '', checkIn: '', checkOut: '', reason: '' });
      setShowRegForm(false);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to submit regularisation');
    }
  }

  async function reviewReg(id: string, action: 'approve' | 'reject') {
    setError(null);
    try {
      await api.patch(`/attendance/regularisations/${id}/${action}`, {});
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to review request');
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
      <h1 className="text-2xl font-extrabold tracking-tight text-brand-700">Attendance</h1>
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      <div className="mt-4 rounded-xl border border-slate-200 bg-white dark:bg-slate-800 shadow-card transition-shadow hover:shadow-card-hover p-4">
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
            className="rounded-xl bg-gradient-to-br from-brand-600 to-brand-500 shadow-md shadow-brand-500/25 px-3 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-40"
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

      {/* Missed-punch correction — a consultant at an airport or hotel site
          visit forgets constantly; before this a missed punch was permanent. */}
      <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-slate-800 dark:text-slate-100">Missed a punch?</p>
          <button onClick={() => setShowRegForm((v) => !v)} className="rounded-lg border border-brand-200 px-3 py-1.5 text-xs font-medium text-brand hover:bg-brand-50">
            {showRegForm ? 'Cancel' : 'Request Regularisation'}
          </button>
        </div>
        {showRegForm && (
          <form onSubmit={handleRegularise} className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="text-xs text-slate-500">
              Date
              <input required type="date" value={regForm.date} onChange={(e) => setRegForm({ ...regForm, date: e.target.value })} max={new Date().toISOString().slice(0, 10)} className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900" />
            </label>
            <div />
            <label className="text-xs text-slate-500">
              Check-in time
              <input type="time" value={regForm.checkIn} onChange={(e) => setRegForm({ ...regForm, checkIn: e.target.value })} className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900" />
            </label>
            <label className="text-xs text-slate-500">
              Check-out time
              <input type="time" value={regForm.checkOut} onChange={(e) => setRegForm({ ...regForm, checkOut: e.target.value })} className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900" />
            </label>
            <textarea required minLength={5} placeholder="Reason" rows={2} value={regForm.reason} onChange={(e) => setRegForm({ ...regForm, reason: e.target.value })} className="rounded-lg border border-slate-300 px-3 py-2 text-sm sm:col-span-2 dark:border-slate-600 dark:bg-slate-900" />
            <button type="submit" className="rounded-xl bg-gradient-to-br from-brand-600 to-brand-500 px-4 py-2 text-sm font-medium text-white shadow-md shadow-brand-500/25 hover:opacity-90 sm:col-span-2">
              Submit Request
            </button>
          </form>
        )}
        {myRegs.length > 0 && (
          <ul className="mt-3 space-y-1 text-xs">
            {myRegs.map((r) => (
              <li key={r.id} className="flex items-center gap-2">
                <span className="text-slate-500">{new Date(r.date).toLocaleDateString('en-IN')}</span>
                <span className={`rounded px-2 py-0.5 ${REG_STATUS_STYLES[r.status]}`}>{r.status}</span>
                <span className="text-slate-400">{r.reason}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {canSeeTeam && pendingRegs.length > 0 && (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/30">
          <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">Pending Regularisation Requests</p>
          <ul className="mt-2 space-y-2">
            {pendingRegs.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-100 bg-white p-2 text-sm dark:border-amber-900 dark:bg-slate-800">
                <span>
                  <span className="font-medium">{r.user?.name}</span> — {new Date(r.date).toLocaleDateString('en-IN')} · {r.reason}
                </span>
                <span className="flex gap-2 text-xs">
                  <button onClick={() => reviewReg(r.id, 'approve')} className="text-emerald-600 hover:underline">Approve</button>
                  <button onClick={() => reviewReg(r.id, 'reject')} className="text-red-500 hover:underline">Reject</button>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {canSeeTeam && (
        <div className="mt-4 overflow-x-auto bg-white dark:bg-slate-800">
          <div className="border-b border-slate-100 px-4 py-2 text-sm font-medium text-slate-800">Team attendance — this month</div>
          <table className="w-full text-sm">
            <thead className="bg-brand-50/60 text-left text-xs font-semibold uppercase tracking-wide text-brand-700 dark:bg-slate-900/40 dark:text-brand-300">
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
