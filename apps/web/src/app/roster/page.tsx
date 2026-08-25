'use client';

import { FormEvent, useEffect, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { useAuth } from '@/lib/auth-context';
import { api, ApiError } from '@/lib/api';
import { Role, type EmployeeDTO, type RosterEntryDTO, type ShiftDTO } from '@holiday-vibez/shared';

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}
function startOfWeek(d: Date) {
  const day = d.getUTCDay();
  const monday = new Date(d);
  monday.setUTCDate(d.getUTCDate() - ((day + 6) % 7));
  return monday;
}

export default function RosterPage() {
  const { user: me } = useAuth();
  const canManage = me?.role === Role.ADMIN || me?.role === Role.DIRECTOR || me?.role === Role.BRANCH_MANAGER;

  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setUTCDate(weekStart.getUTCDate() + i);
    return d;
  });

  const [myRoster, setMyRoster] = useState<RosterEntryDTO[]>([]);
  const [shifts, setShifts] = useState<ShiftDTO[]>([]);
  const [employees, setEmployees] = useState<EmployeeDTO[]>([]);
  const [roster, setRoster] = useState<RosterEntryDTO[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showShiftForm, setShowShiftForm] = useState(false);
  const [shiftForm, setShiftForm] = useState({ name: '', startTime: '09:00', endTime: '18:00' });
  // grid[userId][isoDate] = shiftId | 'WEEK_OFF' | ''
  const [grid, setGrid] = useState<Record<string, Record<string, string>>>({});

  async function load() {
    const from = isoDate(weekStart);
    const to = isoDate(days[6]);
    try {
      setMyRoster(await api.get<RosterEntryDTO[]>(`/roster/me?from=${from}&to=${to}`));
    } catch {
      setMyRoster([]);
    }
    try {
      setShifts(await api.get<ShiftDTO[]>('/roster/shifts'));
    } catch {
      setShifts([]);
    }
    if (!canManage) return;
    try {
      const [emps, entries] = await Promise.all([
        api.get<EmployeeDTO[]>('/employees'),
        api.get<RosterEntryDTO[]>(`/roster?from=${from}&to=${to}`),
      ]);
      setEmployees(emps);
      setRoster(entries);
      const g: Record<string, Record<string, string>> = {};
      for (const emp of emps) g[emp.id] = {};
      for (const e of entries) {
        if (!g[e.userId]) g[e.userId] = {};
        g[e.userId][e.date.slice(0, 10)] = e.isWeekOff ? 'WEEK_OFF' : e.shiftId ?? '';
      }
      setGrid(g);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load roster');
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me?.role, weekStart.getTime()]);

  async function handleCreateShift(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api.post('/roster/shifts', shiftForm);
      setShiftForm({ name: '', startTime: '09:00', endTime: '18:00' });
      setShowShiftForm(false);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to add shift');
    }
  }

  async function publish() {
    setSaving(true);
    setError(null);
    try {
      const assignments = Object.entries(grid).flatMap(([userId, byDate]) =>
        days
          .map((d) => isoDate(d))
          .filter((date) => byDate[date] !== undefined)
          .map((date) => ({
            userId,
            date,
            isWeekOff: byDate[date] === 'WEEK_OFF',
            shiftId: byDate[date] && byDate[date] !== 'WEEK_OFF' ? byDate[date] : undefined,
          })),
      );
      if (assignments.length === 0) {
        setError('Set at least one shift or week-off before publishing');
        return;
      }
      await api.post('/roster/publish', { assignments });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to publish roster');
    } finally {
      setSaving(false);
    }
  }

  function setCell(userId: string, date: string, value: string) {
    setGrid((g) => ({ ...g, [userId]: { ...g[userId], [date]: value } }));
  }

  const dayLabel = (d: Date) => d.toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short' });

  return (
    <AppShell>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-brand-700">Roster</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Shift scheduling and weekly rostering.</p>
        </div>
        {canManage && (
          <button
            onClick={() => setShowShiftForm((v) => !v)}
            className="rounded-xl border border-brand-200 px-3 py-1.5 text-sm font-medium text-brand hover:bg-brand-50"
          >
            {showShiftForm ? 'Cancel' : '+ New Shift'}
          </button>
        )}
      </div>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      {canManage && showShiftForm && (
        <form onSubmit={handleCreateShift} className="mt-4 flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
          <label className="text-xs text-slate-500">
            Name
            <input required value={shiftForm.name} onChange={(e) => setShiftForm({ ...shiftForm, name: e.target.value })} className="mt-1 block rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900" />
          </label>
          <label className="text-xs text-slate-500">
            Start
            <input type="time" value={shiftForm.startTime} onChange={(e) => setShiftForm({ ...shiftForm, startTime: e.target.value })} className="mt-1 block rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900" />
          </label>
          <label className="text-xs text-slate-500">
            End
            <input type="time" value={shiftForm.endTime} onChange={(e) => setShiftForm({ ...shiftForm, endTime: e.target.value })} className="mt-1 block rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900" />
          </label>
          <button type="submit" className="rounded-lg bg-brand px-3 py-2 text-sm font-medium text-white hover:opacity-90">Add Shift</button>
        </form>
      )}

      {/* My own week */}
      <section className="mt-4 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
        <h2 className="text-sm font-semibold text-brand-700">My Week</h2>
        <div className="mt-2 grid grid-cols-2 gap-2 text-center text-xs sm:grid-cols-4 lg:grid-cols-7">
          {days.map((d) => {
            const entry = myRoster.find((r) => r.date.slice(0, 10) === isoDate(d));
            return (
              <div key={isoDate(d)} className="rounded-lg border border-slate-100 p-2 dark:border-slate-700">
                <p className="font-medium text-slate-500">{dayLabel(d)}</p>
                <p className="mt-1 text-slate-700 dark:text-slate-200">
                  {entry?.isWeekOff ? 'Week Off' : entry?.shift ? entry.shift.name : '—'}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {canManage && (
        <section className="mt-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setWeekStart((w) => { const n = new Date(w); n.setUTCDate(w.getUTCDate() - 7); return n; })}
                className="rounded-lg border border-slate-200 px-2 py-1 text-xs hover:bg-slate-50 dark:border-slate-600"
              >
                ← Prev
              </button>
              <span className="text-sm text-slate-600 dark:text-slate-300">{dayLabel(days[0])} – {dayLabel(days[6])}</span>
              <button
                onClick={() => setWeekStart((w) => { const n = new Date(w); n.setUTCDate(w.getUTCDate() + 7); return n; })}
                className="rounded-lg border border-slate-200 px-2 py-1 text-xs hover:bg-slate-50 dark:border-slate-600"
              >
                Next →
              </button>
            </div>
            <button
              onClick={publish}
              disabled={saving}
              className="rounded-xl bg-gradient-to-br from-brand-600 to-brand-500 px-4 py-2 text-sm font-medium text-white shadow-md shadow-brand-500/25 hover:opacity-90 disabled:opacity-60"
            >
              {saving ? 'Publishing…' : 'Publish Week'}
            </button>
          </div>

          <div className="mt-2 overflow-x-auto rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
            <table className="w-full text-sm">
              <thead className="bg-brand-50/60 text-left text-xs font-semibold uppercase tracking-wide text-brand-700 dark:bg-slate-900/40 dark:text-brand-300">
                <tr>
                  <th className="px-3 py-2">Employee</th>
                  {days.map((d) => (
                    <th key={isoDate(d)} className="px-2 py-2 text-center">{dayLabel(d)}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {employees.map((emp) => (
                  <tr key={emp.id} className="border-t border-slate-100 dark:border-slate-700">
                    <td className="px-3 py-2 whitespace-nowrap text-slate-700 dark:text-slate-200">{emp.name}</td>
                    {days.map((d) => {
                      const date = isoDate(d);
                      const value = grid[emp.id]?.[date] ?? '';
                      return (
                        <td key={date} className="px-1 py-1">
                          <select
                            value={value}
                            onChange={(e) => setCell(emp.id, date, e.target.value)}
                            className="w-full rounded border border-slate-200 px-1 py-1 text-xs dark:border-slate-600 dark:bg-slate-900"
                          >
                            <option value="">—</option>
                            <option value="WEEK_OFF">Week Off</option>
                            {shifts.map((s) => (
                              <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                          </select>
                        </td>
                      );
                    })}
                  </tr>
                ))}
                {employees.length === 0 && (
                  <tr><td colSpan={8} className="px-4 py-6 text-center text-slate-400">No employees found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </AppShell>
  );
}
