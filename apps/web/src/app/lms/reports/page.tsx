'use client';

import { useEffect, useMemo, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { useAuth } from '@/lib/auth-context';
import { api, ApiError } from '@/lib/api';
import { Role, type BranchDTO, type CourseDTO, type TrainingCompletionRowDTO } from '@holiday-vibez/shared';

export default function LmsCompletionReportPage() {
  const { user: me } = useAuth();
  const isBranchManager = me?.role === Role.BRANCH_MANAGER;
  const canView = me?.role === Role.DIRECTOR || me?.role === Role.ADMIN || isBranchManager;

  const [courses, setCourses] = useState<CourseDTO[]>([]);
  const [branches, setBranches] = useState<BranchDTO[]>([]);
  const [rows, setRows] = useState<TrainingCompletionRowDTO[]>([]);
  const [courseId, setCourseId] = useState('');
  const [branchId, setBranchId] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!canView) return;
    api.get<CourseDTO[]>('/lms/courses').then(setCourses).catch(() => setCourses([]));
    if (!isBranchManager) {
      api.get<BranchDTO[]>('/branches').then(setBranches).catch(() => setBranches([]));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canView]);

  useEffect(() => {
    if (!canView) return;
    const params = new URLSearchParams();
    if (courseId) params.set('courseId', courseId);
    if (branchId) params.set('branchId', branchId);
    const qs = params.toString();
    api.get<TrainingCompletionRowDTO[]>(`/lms/reports/completion${qs ? `?${qs}` : ''}`)
      .then(setRows)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Failed to load completion report'));
  }, [canView, courseId, branchId]);

  const stats = useMemo(() => {
    const total = rows.length;
    const completed = rows.filter((r) => r.completedAt).length;
    const overdue = rows.filter((r) => r.overdue).length;
    const assigned = rows.filter((r) => r.assigned).length;
    return {
      total,
      completed,
      overdue,
      assigned,
      completionPct: total === 0 ? 0 : Math.round((completed / total) * 100),
    };
  }, [rows]);

  if (!canView) {
    return (
      <AppShell>
        <p className="text-sm text-slate-500 dark:text-slate-400">You don&apos;t have access to training reports.</p>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <h1 className="inline-block rounded-lg bg-brand-50 px-4 py-2 text-xl font-bold tracking-tight text-brand shadow-card">Training Completion</h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        {isBranchManager ? 'Who on your team has completed what training.' : 'Who has completed what training, org-wide.'}
      </p>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      <div className="mt-4 flex flex-wrap gap-2">
        <select value={courseId} onChange={(e) => setCourseId(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-100 transition-colors dark:border-slate-600 dark:bg-slate-900">
          <option value="">All courses</option>
          {courses.map((c) => (
            <option key={c.id} value={c.id}>{c.title}</option>
          ))}
        </select>
        {!isBranchManager && (
          <select value={branchId} onChange={(e) => setBranchId(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-100 transition-colors dark:border-slate-600 dark:bg-slate-900">
            <option value="">All branches</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        )}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-lg bg-white p-4 shadow-card dark:bg-slate-800">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Enrollments</p>
          <p className="mt-1 text-2xl font-bold text-slate-800 dark:text-slate-100">{stats.total}</p>
        </div>
        <div className="rounded-lg bg-white p-4 shadow-card dark:bg-slate-800">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Completed</p>
          <p className="mt-1 text-2xl font-bold text-emerald-600">{stats.completed} <span className="text-sm font-medium text-slate-400">({stats.completionPct}%)</span></p>
        </div>
        <div className="rounded-lg bg-white p-4 shadow-card dark:bg-slate-800">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Overdue</p>
          <p className="mt-1 text-2xl font-bold text-red-600">{stats.overdue}</p>
        </div>
        <div className="rounded-lg bg-white p-4 shadow-card dark:bg-slate-800">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Manager-assigned</p>
          <p className="mt-1 text-2xl font-bold text-slate-800 dark:text-slate-100">{stats.assigned}</p>
        </div>
      </div>

      <div className="mt-4 overflow-hidden bg-white dark:bg-slate-800">
        <table className="w-full text-sm">
          <thead className="bg-brand-50/60 text-left text-xs font-semibold uppercase tracking-wide text-brand-700 dark:bg-slate-900/40">
            <tr>
              <th className="px-4 py-2">Consultant</th>
              {!isBranchManager && <th className="px-4 py-2">Branch</th>}
              <th className="px-4 py-2">Course</th>
              <th className="px-4 py-2">Due date</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">Score</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.enrollmentId} className="border-t border-slate-100 dark:border-slate-700">
                <td className="px-4 py-2.5">
                  <span className="font-medium text-slate-800 dark:text-slate-100">{r.userName}</span>
                  {r.assigned && <span className="ml-1.5 rounded-lg bg-brand-50 px-1.5 py-0.5 text-[10px] font-medium text-brand-700 dark:bg-slate-700 dark:text-brand-200">assigned</span>}
                </td>
                {!isBranchManager && <td className="px-4 py-2.5 text-slate-500 dark:text-slate-400">{r.branchName ?? '—'}</td>}
                <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300">{r.courseTitle}</td>
                <td className="px-4 py-2.5 text-slate-500 dark:text-slate-400">{r.dueDate ? new Date(r.dueDate).toLocaleDateString() : '—'}</td>
                <td className="px-4 py-2.5">
                  {r.completedAt ? (
                    <span className="rounded-lg bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">Completed</span>
                  ) : r.overdue ? (
                    <span className="rounded-lg bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">Overdue</span>
                  ) : (
                    <span className="rounded-lg bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">In progress</span>
                  )}
                </td>
                <td className="px-4 py-2.5 text-slate-500 dark:text-slate-400">{r.latestScore !== null ? `${r.latestScore}%` : '—'}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={isBranchManager ? 5 : 6} className="px-4 py-6 text-center text-slate-400">No enrollments match these filters.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}
