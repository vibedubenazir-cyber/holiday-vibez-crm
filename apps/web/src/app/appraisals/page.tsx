'use client';

import { FormEvent, useEffect, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { useAuth } from '@/lib/auth-context';
import { api, ApiError } from '@/lib/api';
import { Role, type AppraisalCycleDTO, type AppraisalDTO, type EmployeeDTO } from '@holiday-vibez/shared';

const STATUS_STYLES: Record<string, string> = {
  NOT_STARTED: 'bg-slate-100 text-slate-600',
  SELF_REVIEW: 'bg-amber-100 text-amber-700',
  MANAGER_REVIEW: 'bg-blue-100 text-blue-700',
  COMPLETED: 'bg-emerald-100 text-emerald-700',
};

export default function AppraisalsPage() {
  const { user: me } = useAuth();
  const isHr = me?.role === Role.ADMIN || me?.role === Role.DIRECTOR;
  const isManagerTier = isHr || me?.role === Role.BRANCH_MANAGER;

  const [cycles, setCycles] = useState<AppraisalCycleDTO[]>([]);
  const [mine, setMine] = useState<AppraisalDTO[]>([]);
  const [pendingReview, setPendingReview] = useState<AppraisalDTO[]>([]);
  const [employees, setEmployees] = useState<EmployeeDTO[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [showCycleForm, setShowCycleForm] = useState(false);
  const [cycleForm, setCycleForm] = useState({ name: '', startDate: '', endDate: '' });
  const [enrolCycleId, setEnrolCycleId] = useState<string | null>(null);
  const [enrolUserIds, setEnrolUserIds] = useState<string[]>([]);

  const [reviewing, setReviewing] = useState<AppraisalDTO | null>(null);
  const [selfComments, setSelfComments] = useState('');
  const [managerComments, setManagerComments] = useState('');
  const [finalRating, setFinalRating] = useState(3);

  async function load() {
    try {
      setMine(await api.get<AppraisalDTO[]>('/appraisals/me'));
    } catch {
      setMine([]);
    }
    try {
      setPendingReview(await api.get<AppraisalDTO[]>('/appraisals/pending-my-review'));
    } catch {
      setPendingReview([]);
    }
    if (isManagerTier) {
      try {
        setCycles(await api.get<AppraisalCycleDTO[]>('/appraisals/cycles'));
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'Failed to load cycles');
      }
    }
    if (isHr) {
      api.get<EmployeeDTO[]>('/employees').then(setEmployees).catch(() => setEmployees([]));
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me?.role]);

  async function createCycle(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api.post('/appraisals/cycles', cycleForm);
      setCycleForm({ name: '', startDate: '', endDate: '' });
      setShowCycleForm(false);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to create cycle');
    }
  }

  async function setCycleStatus(id: string, action: 'activate' | 'close') {
    setError(null);
    try {
      await api.patch(`/appraisals/cycles/${id}/${action}`, {});
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to update cycle');
    }
  }

  async function enrol() {
    if (!enrolCycleId || enrolUserIds.length === 0) return;
    setError(null);
    try {
      await api.post(`/appraisals/cycles/${enrolCycleId}/enrol`, { userIds: enrolUserIds });
      setEnrolCycleId(null);
      setEnrolUserIds([]);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to enrol employees');
    }
  }

  function openSelfReview(a: AppraisalDTO) {
    setReviewing(a);
    setSelfComments(a.selfComments ?? '');
  }

  async function submitSelfReview() {
    if (!reviewing) return;
    setError(null);
    try {
      await api.patch(`/appraisals/${reviewing.id}/self-review`, { selfComments });
      setReviewing(null);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to submit self-review');
    }
  }

  function openManagerReview(a: AppraisalDTO) {
    setReviewing(a);
    setManagerComments(a.managerComments ?? '');
    setFinalRating(a.finalRating ?? 3);
  }

  async function submitManagerReview() {
    if (!reviewing) return;
    setError(null);
    try {
      await api.patch(`/appraisals/${reviewing.id}/manager-review`, { managerComments, finalRating });
      setReviewing(null);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to submit manager review');
    }
  }

  return (
    <AppShell>
      <h1 className="text-2xl font-extrabold tracking-tight text-brand-700">Appraisals</h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        Cycle-based performance appraisals — self-review, then manager review.
      </p>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      {/* My appraisals */}
      <section className="mt-4 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
        <h2 className="text-sm font-semibold text-brand-700">My Appraisals</h2>
        <div className="mt-2 space-y-2">
          {mine.map((a) => (
            <div key={a.id} className="flex items-center justify-between rounded-lg border border-slate-100 p-2 text-sm dark:border-slate-700">
              <div>
                <span className="font-medium text-slate-700 dark:text-slate-200">{a.cycle?.name}</span>{' '}
                <span className={`ml-2 rounded px-2 py-0.5 text-xs ${STATUS_STYLES[a.status]}`}>{a.status.replace('_', ' ')}</span>
              </div>
              {(a.status === 'NOT_STARTED' || a.status === 'SELF_REVIEW') && (
                <button onClick={() => openSelfReview(a)} className="text-xs text-brand hover:underline">Fill self-review</button>
              )}
            </div>
          ))}
          {mine.length === 0 && <p className="text-xs text-slate-400">No appraisals assigned yet.</p>}
        </div>
      </section>

      {/* Pending my review as a manager */}
      {pendingReview.length > 0 && (
        <section className="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-950/30">
          <h2 className="text-sm font-semibold text-blue-800 dark:text-blue-300">Awaiting My Review</h2>
          <div className="mt-2 space-y-2">
            {pendingReview.map((a) => (
              <div key={a.id} className="flex items-center justify-between rounded-lg border border-blue-100 bg-white p-2 text-sm dark:border-blue-900 dark:bg-slate-800">
                <span>{a.user?.name} — {a.cycle?.name}</span>
                <button onClick={() => openManagerReview(a)} className="text-xs text-brand hover:underline">Review</button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Review modal (inline panel) */}
      {reviewing && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white p-5 dark:bg-slate-800">
            <h3 className="text-sm font-semibold text-brand-700">
              {reviewing.status === 'MANAGER_REVIEW' && me?.id === reviewing.managerId ? 'Manager Review' : 'Self Review'} — {reviewing.cycle?.name}
            </h3>
            {reviewing.status !== 'MANAGER_REVIEW' || me?.id !== reviewing.managerId ? (
              <>
                <textarea rows={4} placeholder="Self comments" value={selfComments} onChange={(e) => setSelfComments(e.target.value)} className="mt-3 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900" />
                <div className="mt-3 flex justify-end gap-2">
                  <button onClick={() => setReviewing(null)} className="text-sm text-slate-500 hover:underline">Cancel</button>
                  <button onClick={submitSelfReview} className="rounded-lg bg-brand px-3 py-1.5 text-sm font-medium text-white hover:opacity-90">Submit</button>
                </div>
              </>
            ) : (
              <>
                <textarea rows={4} placeholder="Manager comments" value={managerComments} onChange={(e) => setManagerComments(e.target.value)} className="mt-3 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900" />
                <label className="mt-3 block text-xs text-slate-500">
                  Final rating (1–5)
                  <input type="number" min={1} max={5} value={finalRating} onChange={(e) => setFinalRating(Number(e.target.value))} className="mt-1 block w-24 rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900" />
                </label>
                <div className="mt-3 flex justify-end gap-2">
                  <button onClick={() => setReviewing(null)} className="text-sm text-slate-500 hover:underline">Cancel</button>
                  <button onClick={submitManagerReview} className="rounded-lg bg-brand px-3 py-1.5 text-sm font-medium text-white hover:opacity-90">Complete</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Cycle management */}
      {isManagerTier && (
        <section className="mt-6">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-brand-700">Appraisal Cycles</h2>
            {isHr && (
              <button onClick={() => setShowCycleForm((v) => !v)} className="rounded-lg border border-brand-200 px-3 py-1.5 text-xs font-medium text-brand hover:bg-brand-50">
                {showCycleForm ? 'Cancel' : '+ New Cycle'}
              </button>
            )}
          </div>

          {isHr && showCycleForm && (
            <form onSubmit={createCycle} className="mt-3 flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
              <input required placeholder="Cycle name (e.g. H1 2026)" value={cycleForm.name} onChange={(e) => setCycleForm({ ...cycleForm, name: e.target.value })} className="rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900" />
              <input required type="date" value={cycleForm.startDate} onChange={(e) => setCycleForm({ ...cycleForm, startDate: e.target.value })} className="rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900" />
              <input required type="date" value={cycleForm.endDate} onChange={(e) => setCycleForm({ ...cycleForm, endDate: e.target.value })} className="rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900" />
              <button type="submit" className="rounded-lg bg-brand px-3 py-2 text-sm font-medium text-white hover:opacity-90">Create</button>
            </form>
          )}

          <div className="mt-3 space-y-2">
            {cycles.map((c) => (
              <div key={c.id} className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-800">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-medium text-slate-800 dark:text-slate-100">{c.name}</span>{' '}
                    <span className="text-xs text-slate-400">
                      {new Date(c.startDate).toLocaleDateString('en-IN')} – {new Date(c.endDate).toLocaleDateString('en-IN')} · {c._count?.appraisals ?? 0} enrolled
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className={`rounded px-2 py-0.5 ${c.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' : c.status === 'CLOSED' ? 'bg-slate-200 text-slate-600' : 'bg-amber-100 text-amber-700'}`}>{c.status}</span>
                    {isHr && c.status === 'DRAFT' && <button onClick={() => setCycleStatus(c.id, 'activate')} className="text-brand hover:underline">Activate</button>}
                    {isHr && c.status === 'ACTIVE' && <button onClick={() => setCycleStatus(c.id, 'close')} className="text-red-500 hover:underline">Close</button>}
                    {isHr && c.status !== 'CLOSED' && <button onClick={() => setEnrolCycleId(enrolCycleId === c.id ? null : c.id)} className="text-brand hover:underline">Enrol</button>}
                  </div>
                </div>
                {isHr && enrolCycleId === c.id && (
                  <div className="mt-3 rounded-lg border border-slate-100 p-3 dark:border-slate-700">
                    <div className="flex max-h-40 flex-wrap gap-2 overflow-y-auto">
                      {employees.map((emp) => (
                        <label key={emp.id} className="flex items-center gap-1.5 text-xs">
                          <input
                            type="checkbox"
                            checked={enrolUserIds.includes(emp.id)}
                            onChange={(e) =>
                              setEnrolUserIds((ids) => (e.target.checked ? [...ids, emp.id] : ids.filter((id) => id !== emp.id)))
                            }
                          />
                          {emp.name}
                        </label>
                      ))}
                    </div>
                    <button onClick={enrol} disabled={enrolUserIds.length === 0} className="mt-2 rounded-lg bg-brand px-3 py-1 text-xs font-medium text-white hover:opacity-90 disabled:opacity-40">
                      Enrol {enrolUserIds.length || ''} employee(s)
                    </button>
                  </div>
                )}
              </div>
            ))}
            {cycles.length === 0 && <p className="text-xs text-slate-400">No appraisal cycles yet.</p>}
          </div>
        </section>
      )}
    </AppShell>
  );
}
