'use client';

import { FormEvent, useEffect, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { useAuth } from '@/lib/auth-context';
import { api, ApiError } from '@/lib/api';
import {
  AssignmentScope,
  Role,
  type BranchDTO,
  type CourseAssignmentDTO,
  type CourseDTO,
  type LeaderboardRowDTO,
  type UserDTO,
} from '@holiday-vibez/shared';

const ROLE_OPTIONS = [Role.DIRECTOR, Role.ADMIN, Role.BRANCH_MANAGER, Role.TRAVEL_CONSULTANT];
const ROLE_LABELS: Record<string, string> = {
  DIRECTOR: 'Director',
  ADMIN: 'Admin',
  BRANCH_MANAGER: 'Branch Manager',
  TRAVEL_CONSULTANT: 'Travel Consultant',
};

export default function AssignTrainingPage() {
  const { user: me } = useAuth();
  const isBranchManager = me?.role === Role.BRANCH_MANAGER;
  const canAssign = me?.role === Role.DIRECTOR || me?.role === Role.ADMIN || isBranchManager;

  const [courses, setCourses] = useState<CourseDTO[]>([]);
  const [branches, setBranches] = useState<BranchDTO[]>([]);
  const [consultants, setConsultants] = useState<LeaderboardRowDTO[]>([]);
  const [users, setUsers] = useState<UserDTO[]>([]);
  const [assignments, setAssignments] = useState<CourseAssignmentDTO[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [form, setForm] = useState({
    courseId: '',
    scope: AssignmentScope.BRANCH as AssignmentScope,
    scopeId: '',
    dueDate: '',
    notes: '',
  });

  async function load() {
    try {
      const [c, a] = await Promise.all([
        api.get<CourseDTO[]>('/lms/courses'),
        api.get<CourseAssignmentDTO[]>('/lms/assignments'),
      ]);
      setCourses(c);
      setAssignments(a);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load training data');
    }
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!me || !canAssign) return;
    if (isBranchManager && me.branchId) {
      api.get<LeaderboardRowDTO[]>(`/targets/leaderboard/branch?branchId=${me.branchId}`).then(setConsultants).catch(() => setConsultants([]));
    } else {
      api.get<BranchDTO[]>('/branches').then(setBranches).catch(() => setBranches([]));
      api.get<UserDTO[]>('/users').then(setUsers).catch(() => setUsers([]));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me?.id]);

  async function handleAssign(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    if (!form.courseId || !form.scopeId) {
      setError('Choose a course and a target');
      return;
    }
    try {
      await api.post('/lms/assignments', {
        courseId: form.courseId,
        scope: form.scope,
        scopeId: form.scopeId,
        dueDate: form.dueDate || undefined,
        notes: form.notes || undefined,
      });
      setNotice('Training assigned');
      setForm({ courseId: '', scope: AssignmentScope.BRANCH, scopeId: '', dueDate: '', notes: '' });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to assign training');
    }
  }

  if (!canAssign) {
    return (
      <AppShell>
        <p className="text-sm text-slate-500 dark:text-slate-400">You don&apos;t have access to assign training.</p>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <h1 className="inline-block rounded-lg bg-brand-50 px-4 py-2 text-xl font-bold tracking-tight text-brand shadow-card">Assign Training</h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        {isBranchManager
          ? 'Assign a course to a consultant on your team, or to your whole branch.'
          : 'Assign a course to a specific consultant, a branch, or everyone with a given role.'}
      </p>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      {notice && <p className="mt-3 text-sm text-emerald-600">{notice}</p>}

      <form onSubmit={handleAssign} className="mt-4 flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-card transition-shadow hover:shadow-card-hover dark:border-slate-700 dark:bg-slate-800">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-slate-500">Course</label>
          <select
            required
            value={form.courseId}
            onChange={(e) => setForm({ ...form, courseId: e.target.value })}
            className="w-56 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-100 transition-colors dark:border-slate-600 dark:bg-slate-900"
          >
            <option value="">Select a course</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>{c.title}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-slate-500">Assign to</label>
          <select
            value={form.scope}
            onChange={(e) => setForm({ ...form, scope: e.target.value as AssignmentScope, scopeId: '' })}
            className="w-44 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-100 transition-colors dark:border-slate-600 dark:bg-slate-900"
          >
            <option value={AssignmentScope.CONSULTANT}>A consultant</option>
            <option value={AssignmentScope.BRANCH}>A whole branch</option>
            {!isBranchManager && <option value={AssignmentScope.ROLE}>Everyone with a role</option>}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-slate-500">Target</label>
          {form.scope === AssignmentScope.CONSULTANT && (
            <select
              required
              value={form.scopeId}
              onChange={(e) => setForm({ ...form, scopeId: e.target.value })}
              className="w-56 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-100 transition-colors dark:border-slate-600 dark:bg-slate-900"
            >
              <option value="">Select a consultant</option>
              {isBranchManager
                ? consultants.map((c) => (
                    <option key={c.consultantId} value={c.consultantId}>{c.name}</option>
                  ))
                : users
                    .filter((u) => u.status === 'ACTIVE')
                    .map((u) => (
                      <option key={u.id} value={u.id}>{u.name} · {ROLE_LABELS[u.role] ?? u.role}</option>
                    ))}
            </select>
          )}
          {form.scope === AssignmentScope.BRANCH && (
            isBranchManager ? (
              <input readOnly value={me?.branchId ? 'Your branch' : '—'} className="w-56 rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-500 dark:border-slate-600 dark:bg-slate-900" />
            ) : (
              <select
                required
                value={form.scopeId}
                onChange={(e) => setForm({ ...form, scopeId: e.target.value })}
                className="w-56 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-100 transition-colors dark:border-slate-600 dark:bg-slate-900"
              >
                <option value="">Select a branch</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            )
          )}
          {form.scope === AssignmentScope.ROLE && (
            <select
              required
              value={form.scopeId}
              onChange={(e) => setForm({ ...form, scopeId: e.target.value })}
              className="w-56 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-100 transition-colors dark:border-slate-600 dark:bg-slate-900"
            >
              <option value="">Select a role</option>
              {ROLE_OPTIONS.map((r) => (
                <option key={r} value={r}>{ROLE_LABELS[r]}</option>
              ))}
            </select>
          )}
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-slate-500">Due date (optional)</label>
          <input
            type="date"
            value={form.dueDate}
            onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-100 transition-colors dark:border-slate-600 dark:bg-slate-900"
          />
        </div>

        <div className="flex flex-1 flex-col gap-1">
          <label className="text-xs font-medium text-slate-500">Notes (optional)</label>
          <input
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            placeholder="Why this training, or any context"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-100 transition-colors dark:border-slate-600 dark:bg-slate-900"
          />
        </div>

        <button type="submit" className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark">Assign</button>
      </form>

      <p className="mt-6 text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Recent assignments</p>
      <div className="mt-2 overflow-hidden bg-white dark:bg-slate-800">
        <table className="w-full text-sm">
          <thead className="bg-brand-50/60 text-left text-xs font-semibold uppercase tracking-wide text-brand-700 dark:bg-slate-900/40">
            <tr>
              <th className="px-4 py-2">Course</th>
              <th className="px-4 py-2">Assigned to</th>
              <th className="px-4 py-2">Covers</th>
              <th className="px-4 py-2">Due date</th>
              <th className="px-4 py-2">By</th>
              <th className="px-4 py-2">When</th>
            </tr>
          </thead>
          <tbody>
            {assignments.map((a) => (
              <tr key={a.id} className="border-t border-slate-100 dark:border-slate-700">
                <td className="px-4 py-2.5 font-medium text-slate-800 dark:text-slate-100">{a.courseTitle}</td>
                <td className="px-4 py-2.5">
                  <span className="rounded-lg bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-700 dark:text-slate-300">{a.scope}</span>{' '}
                  <span className="text-slate-600 dark:text-slate-300">{a.scopeLabel}</span>
                </td>
                <td className="px-4 py-2.5 text-slate-500 dark:text-slate-400">{a.userCount} {a.userCount === 1 ? 'person' : 'people'}</td>
                <td className="px-4 py-2.5 text-slate-500 dark:text-slate-400">{a.dueDate ? new Date(a.dueDate).toLocaleDateString() : '—'}</td>
                <td className="px-4 py-2.5 text-slate-500 dark:text-slate-400">{a.assignedByName}</td>
                <td className="px-4 py-2.5 text-slate-500 dark:text-slate-400">{new Date(a.assignedAt).toLocaleDateString()}</td>
              </tr>
            ))}
            {assignments.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-6 text-center text-slate-400">No training assigned yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}
