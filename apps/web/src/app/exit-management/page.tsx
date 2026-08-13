'use client';

import { FormEvent, useEffect, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { useAuth } from '@/lib/auth-context';
import { api, ApiError } from '@/lib/api';
import { Role, type EmployeeDTO, type ExitRecordDTO } from '@holiday-vibez/shared';

const STATUS_STYLES: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-700',
  CLEARED: 'bg-emerald-100 text-emerald-700',
};

export default function ExitManagementPage() {
  const { user: me } = useAuth();
  const canSeeTeam = me?.role === Role.ADMIN || me?.role === Role.DIRECTOR || me?.role === Role.BRANCH_MANAGER;
  const canClear = me?.role === Role.ADMIN || me?.role === Role.DIRECTOR;

  const [mine, setMine] = useState<ExitRecordDTO | null>(null);
  const [team, setTeam] = useState<ExitRecordDTO[]>([]);
  const [employees, setEmployees] = useState<EmployeeDTO[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [resignForm, setResignForm] = useState({ noticeDate: '', lastWorkingDate: '', reason: '' });
  const [showResignForm, setShowResignForm] = useState(false);

  const [termForm, setTermForm] = useState({ userId: '', noticeDate: '', lastWorkingDate: '', reason: '' });
  const [showTermForm, setShowTermForm] = useState(false);

  const [clearingId, setClearingId] = useState<string | null>(null);
  const [clearNotes, setClearNotes] = useState('');

  async function load() {
    try {
      setMine(await api.get<ExitRecordDTO | null>('/exit-management/me').catch(() => null));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load your exit record');
    }
    if (canSeeTeam) {
      try {
        const [t, e] = await Promise.all([
          api.get<ExitRecordDTO[]>('/exit-management'),
          api.get<EmployeeDTO[]>('/employees'),
        ]);
        setTeam(t);
        setEmployees(e);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'Failed to load team exits');
      }
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me?.role]);

  async function handleResign(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    try {
      await api.post('/exit-management/resign', resignForm);
      setShowResignForm(false);
      setNotice('Resignation submitted');
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to submit resignation');
    }
  }

  async function handleTerminate(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    if (!termForm.userId) {
      setError('Choose an employee');
      return;
    }
    try {
      await api.post(`/exit-management/${termForm.userId}/terminate`, {
        noticeDate: termForm.noticeDate,
        lastWorkingDate: termForm.lastWorkingDate,
        reason: termForm.reason,
      });
      setShowTermForm(false);
      setTermForm({ userId: '', noticeDate: '', lastWorkingDate: '', reason: '' });
      setNotice('Termination recorded');
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to record termination');
    }
  }

  async function confirmClear(id: string) {
    setError(null);
    try {
      await api.patch(`/exit-management/${id}/clear`, { exitInterviewNotes: clearNotes || undefined });
      setClearingId(null);
      setClearNotes('');
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to clear exit');
    }
  }

  return (
    <AppShell>
      <h1 className="inline-block rounded-lg bg-brand-50 px-4 py-2 text-xl font-bold tracking-tight text-brand shadow-card">Exit Management</h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Resignations, terminations, and offboarding clearance.</p>
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      {notice && <p className="mt-3 text-sm text-emerald-600">{notice}</p>}

      <div className="mt-4 rounded-lg bg-white p-4 shadow-card dark:bg-slate-800">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">My Exit</p>
          {!mine && (
            <button onClick={() => setShowResignForm((s) => !s)} className="text-sm text-brand hover:underline">
              {showResignForm ? 'Cancel' : 'Submit resignation'}
            </button>
          )}
        </div>

        {mine ? (
          <div className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            <p><span className="font-medium">{mine.type === 'RESIGNATION' ? 'Resignation' : 'Termination'}</span> — <span className={`rounded-lg px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[mine.status]}`}>{mine.status}</span></p>
            <p className="mt-1 text-xs text-slate-400">Notice: {new Date(mine.noticeDate).toLocaleDateString()} · Last working day: {new Date(mine.lastWorkingDate).toLocaleDateString()}</p>
            <p className="mt-1">{mine.reason}</p>
          </div>
        ) : showResignForm ? (
          <form onSubmit={handleResign} className="mt-2 flex flex-col gap-2 rounded-lg border border-slate-100 bg-slate-50/60 p-3 dark:border-slate-700 dark:bg-slate-900/30">
            <div className="flex flex-wrap gap-2">
              <input required type="date" value={resignForm.noticeDate} onChange={(e) => setResignForm({ ...resignForm, noticeDate: e.target.value })} className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none dark:border-slate-600 dark:bg-slate-900" />
              <input required type="date" value={resignForm.lastWorkingDate} onChange={(e) => setResignForm({ ...resignForm, lastWorkingDate: e.target.value })} className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none dark:border-slate-600 dark:bg-slate-900" />
            </div>
            <input required placeholder="Reason for resigning" value={resignForm.reason} onChange={(e) => setResignForm({ ...resignForm, reason: e.target.value })} className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none dark:border-slate-600 dark:bg-slate-900" />
            <button type="submit" className="self-start rounded-lg bg-brand px-3 py-2 text-sm font-medium text-white hover:bg-brand-dark">Submit</button>
          </form>
        ) : (
          <p className="mt-2 text-sm text-slate-400">No exit record on file.</p>
        )}
      </div>

      {canSeeTeam && (
        <>
          <div className="mt-6 flex items-center justify-between">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
              {me?.role === Role.BRANCH_MANAGER ? "Your Branch's Exits" : 'All Exits'}
            </p>
            {canClear && (
              <button onClick={() => setShowTermForm((s) => !s)} className="text-sm text-brand hover:underline">
                {showTermForm ? 'Cancel' : 'Record termination'}
              </button>
            )}
          </div>

          {canClear && showTermForm && (
            <form onSubmit={handleTerminate} className="mt-2 flex flex-wrap items-end gap-2 rounded-lg border border-slate-100 bg-slate-50/60 p-3 dark:border-slate-700 dark:bg-slate-900/30">
              <select required value={termForm.userId} onChange={(e) => setTermForm({ ...termForm, userId: e.target.value })} className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none dark:border-slate-600 dark:bg-slate-900">
                <option value="">Select employee</option>
                {employees.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
              <input required type="date" value={termForm.noticeDate} onChange={(e) => setTermForm({ ...termForm, noticeDate: e.target.value })} className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none dark:border-slate-600 dark:bg-slate-900" />
              <input required type="date" value={termForm.lastWorkingDate} onChange={(e) => setTermForm({ ...termForm, lastWorkingDate: e.target.value })} className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none dark:border-slate-600 dark:bg-slate-900" />
              <input required placeholder="Reason" value={termForm.reason} onChange={(e) => setTermForm({ ...termForm, reason: e.target.value })} className="flex-1 min-w-[160px] rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none dark:border-slate-600 dark:bg-slate-900" />
              <button type="submit" className="rounded-lg bg-brand px-3 py-2 text-sm font-medium text-white hover:bg-brand-dark">Record</button>
            </form>
          )}

          <div className="mt-2 overflow-hidden bg-white dark:bg-slate-800">
            <table className="w-full text-sm">
              <thead className="bg-brand-50/60 text-left text-xs font-semibold uppercase tracking-wide text-brand-700 dark:bg-slate-900/40 dark:text-brand-300">
                <tr>
                  <th className="px-4 py-2">Employee</th>
                  <th className="px-4 py-2">Type</th>
                  <th className="px-4 py-2">Last working day</th>
                  <th className="px-4 py-2">Status</th>
                  {canClear && <th className="px-4 py-2 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {team.map((r) => (
                  <tr key={r.id} className="border-t border-slate-100 dark:border-slate-700">
                    <td className="px-4 py-2 font-medium text-slate-800 dark:text-slate-100">{r.user?.name ?? r.userId}</td>
                    <td className="px-4 py-2 text-slate-500 dark:text-slate-400">{r.type === 'RESIGNATION' ? 'Resignation' : 'Termination'}</td>
                    <td className="px-4 py-2 text-slate-500 dark:text-slate-400">{new Date(r.lastWorkingDate).toLocaleDateString()}</td>
                    <td className="px-4 py-2">
                      <span className={`rounded-lg px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[r.status]}`}>{r.status}</span>
                    </td>
                    {canClear && (
                      <td className="px-4 py-2 text-right">
                        {r.status === 'PENDING' && clearingId !== r.id && (
                          <button onClick={() => { setClearingId(r.id); setClearNotes(''); }} className="text-brand hover:underline">Clear</button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
                {canClear && clearingId && (
                  <tr className="border-t border-slate-100 bg-brand-50/40 dark:bg-slate-900/30">
                    <td colSpan={5} className="px-4 py-2.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <input
                          autoFocus
                          placeholder="Exit interview notes (optional)"
                          value={clearNotes}
                          onChange={(e) => setClearNotes(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && confirmClear(clearingId)}
                          className="flex-1 min-w-[200px] rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:border-brand focus:outline-none dark:border-slate-600 dark:bg-slate-900"
                        />
                        <button onClick={() => confirmClear(clearingId)} className="rounded-lg bg-brand px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-dark">Confirm clearance</button>
                        <button onClick={() => setClearingId(null)} className="text-sm text-slate-500 hover:underline">Cancel</button>
                      </div>
                    </td>
                  </tr>
                )}
                {team.length === 0 && (
                  <tr><td colSpan={canClear ? 5 : 4} className="px-4 py-6 text-center text-slate-400">No exit records.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </AppShell>
  );
}
