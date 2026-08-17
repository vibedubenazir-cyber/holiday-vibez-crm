'use client';

import { FormEvent, useEffect, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { useAuth } from '@/lib/auth-context';
import { api, ApiError } from '@/lib/api';
import { Role, type EmployeeDTO, type OnboardingProgressDTO, type OnboardingTaskDTO } from '@holiday-vibez/shared';

export default function OnboardingPage() {
  const { user: me } = useAuth();
  const isHr = me?.role === Role.ADMIN || me?.role === Role.DIRECTOR || me?.role === Role.BRANCH_MANAGER;

  const [mine, setMine] = useState<OnboardingTaskDTO[]>([]);
  const [inProgress, setInProgress] = useState<OnboardingProgressDTO[]>([]);
  const [employees, setEmployees] = useState<EmployeeDTO[]>([]);
  const [selected, setSelected] = useState<{ userId: string; name: string } | null>(null);
  const [selectedTasks, setSelectedTasks] = useState<OnboardingTaskDTO[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [startUserId, setStartUserId] = useState('');
  const [newTask, setNewTask] = useState('');

  async function load() {
    try {
      setMine(await api.get<OnboardingTaskDTO[]>('/onboarding/me'));
    } catch {
      setMine([]);
    }
    if (!isHr) return;
    try {
      const [prog, emps] = await Promise.all([
        api.get<OnboardingProgressDTO[]>('/onboarding'),
        api.get<EmployeeDTO[]>('/employees'),
      ]);
      setInProgress(prog);
      setEmployees(emps);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load onboarding data');
    }
  }

  async function loadUserTasks(userId: string) {
    try {
      setSelectedTasks(await api.get<OnboardingTaskDTO[]>(`/onboarding/user/${userId}`));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load checklist');
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me?.role]);

  useEffect(() => {
    if (selected) loadUserTasks(selected.userId);
  }, [selected]);

  async function complete(id: string, done: boolean, forSelf: boolean) {
    setError(null);
    try {
      await api.patch(`/onboarding/tasks/${id}/${done ? 'complete' : 'reopen'}`, {});
      if (forSelf) await load();
      else if (selected) await loadUserTasks(selected.userId);
      if (!forSelf) await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to update task');
    }
  }

  async function handleStart(e: FormEvent) {
    e.preventDefault();
    if (!startUserId) return;
    setError(null);
    try {
      await api.post('/onboarding', { userId: startUserId });
      setStarting(false);
      setStartUserId('');
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to start onboarding — a checklist may already exist');
    }
  }

  async function addTask(e: FormEvent) {
    e.preventDefault();
    if (!selected || !newTask.trim()) return;
    setError(null);
    try {
      await api.post('/onboarding/tasks', { userId: selected.userId, title: newTask.trim() });
      setNewTask('');
      await loadUserTasks(selected.userId);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to add task');
    }
  }

  return (
    <AppShell>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-brand-700">Onboarding</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            The joining checklist — the counterpart to Exit Management's clearance list.
          </p>
        </div>
        {isHr && (
          <button
            onClick={() => setStarting((v) => !v)}
            className="rounded-xl bg-gradient-to-br from-brand-600 to-brand-500 px-4 py-2 text-sm font-medium text-white shadow-md shadow-brand-500/25 hover:opacity-90"
          >
            {starting ? 'Cancel' : '+ Start Onboarding'}
          </button>
        )}
      </div>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      {isHr && starting && (
        <form onSubmit={handleStart} className="mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
          <select
            required
            value={startUserId}
            onChange={(e) => setStartUserId(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900"
          >
            <option value="">Select employee…</option>
            {employees.map((emp) => (
              <option key={emp.id} value={emp.id}>
                {emp.name} {emp.employeeCode ? `(${emp.employeeCode})` : ''}
              </option>
            ))}
          </select>
          <p className="text-xs text-slate-400">Seeds the standard joining checklist — add or remove items after.</p>
          <button type="submit" className="rounded-lg bg-brand px-3 py-1.5 text-sm font-medium text-white hover:opacity-90">
            Start
          </button>
        </form>
      )}

      {/* My own checklist — shown to everyone, empty if HR hasn't started one for them */}
      {mine.length > 0 && (
        <section className="mt-4 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
          <h2 className="text-sm font-semibold text-brand-700">My Checklist</h2>
          <ul className="mt-2 space-y-1.5">
            {mine.map((t) => (
              <li key={t.id} className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={t.completed} onChange={(e) => complete(t.id, e.target.checked, true)} />
                <span className={t.completed ? 'text-slate-400 line-through' : 'text-slate-700 dark:text-slate-200'}>{t.title}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {isHr && (
        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-[280px_1fr]">
          <div className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-800">
            <p className="mb-2 text-xs font-semibold uppercase text-slate-400">In progress</p>
            <ul className="space-y-1">
              {inProgress.map((p) => (
                <li key={p.user.id}>
                  <button
                    onClick={() => setSelected({ userId: p.user.id, name: p.user.name })}
                    className={`flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left text-sm ${
                      selected?.userId === p.user.id ? 'bg-brand-50 text-brand-700' : 'hover:bg-slate-50 dark:hover:bg-slate-700'
                    }`}
                  >
                    <span>{p.user.name}</span>
                    <span className="text-xs text-slate-400">{p.done}/{p.total}</span>
                  </button>
                </li>
              ))}
              {inProgress.length === 0 && <p className="px-2 py-1 text-xs text-slate-400">Nobody currently onboarding.</p>}
            </ul>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
            {selected ? (
              <>
                <h2 className="text-sm font-semibold text-brand-700">{selected.name}'s checklist</h2>
                <ul className="mt-3 space-y-1.5">
                  {selectedTasks.map((t) => (
                    <li key={t.id} className="flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={t.completed} onChange={(e) => complete(t.id, e.target.checked, false)} />
                      <span className={t.completed ? 'text-slate-400 line-through' : 'text-slate-700 dark:text-slate-200'}>{t.title}</span>
                      {t.dueDate && <span className="text-xs text-slate-400">due {new Date(t.dueDate).toLocaleDateString('en-IN')}</span>}
                    </li>
                  ))}
                </ul>
                <form onSubmit={addTask} className="mt-3 flex gap-2">
                  <input
                    placeholder="Add a task…"
                    value={newTask}
                    onChange={(e) => setNewTask(e.target.value)}
                    className="flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-900"
                  />
                  <button type="submit" className="rounded-lg border border-brand-200 px-3 py-1.5 text-xs font-medium text-brand hover:bg-brand-50">
                    Add
                  </button>
                </form>
              </>
            ) : (
              <p className="text-sm text-slate-400">Select an employee to view their checklist.</p>
            )}
          </div>
        </div>
      )}
    </AppShell>
  );
}
