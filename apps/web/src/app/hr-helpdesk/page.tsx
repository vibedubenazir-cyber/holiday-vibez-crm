'use client';

import { FormEvent, useEffect, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { useAuth } from '@/lib/auth-context';
import { api, ApiError } from '@/lib/api';
import { HrTicketCategory, Role, type HrTicketDTO, type UserDTO } from '@holiday-vibez/shared';

const CATEGORY_OPTIONS = [HrTicketCategory.IT_ACCESS, HrTicketCategory.PAYROLL_QUERY, HrTicketCategory.BENEFITS, HrTicketCategory.WORKPLACE, HrTicketCategory.OTHER];
const PRIORITY_OPTIONS = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];
const STATUS_OPTIONS = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];

const PRIORITY_COLORS: Record<string, string> = {
  LOW: 'bg-slate-200 text-slate-700',
  MEDIUM: 'bg-blue-100 text-blue-700',
  HIGH: 'bg-amber-100 text-amber-700',
  URGENT: 'bg-red-100 text-red-700',
};

const STATUS_COLORS: Record<string, string> = {
  OPEN: 'bg-slate-200 text-slate-700',
  IN_PROGRESS: 'bg-blue-100 text-blue-700',
  RESOLVED: 'bg-emerald-100 text-emerald-700',
  CLOSED: 'bg-slate-100 text-slate-400',
};

export default function HrHelpdeskPage() {
  const { user: me } = useAuth();
  const canManage = me?.role === Role.ADMIN || me?.role === Role.DIRECTOR || me?.role === Role.BRANCH_MANAGER;
  const canSeeAllUsers = me?.role === Role.ADMIN || me?.role === Role.DIRECTOR;

  const [mine, setMine] = useState<HrTicketDTO[]>([]);
  const [team, setTeam] = useState<HrTicketDTO[]>([]);
  const [users, setUsers] = useState<UserDTO[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ category: HrTicketCategory.IT_ACCESS as string, subject: '', description: '', priority: 'MEDIUM' });

  async function load() {
    try {
      setMine(await api.get<HrTicketDTO[]>('/hr-helpdesk/mine'));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load your tickets');
    }
    if (canManage) {
      try {
        setTeam(await api.get<HrTicketDTO[]>('/hr-helpdesk'));
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'Failed to load team tickets');
      }
    }
    if (canSeeAllUsers) {
      try {
        setUsers(await api.get<UserDTO[]>('/users'));
      } catch {
        // non-fatal — user list is only needed for assignment
      }
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me?.role]);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api.post('/hr-helpdesk', form);
      setForm({ category: HrTicketCategory.IT_ACCESS, subject: '', description: '', priority: 'MEDIUM' });
      setShowForm(false);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to create ticket');
    }
  }

  async function handleUpdate(id: string, patch: Partial<{ status: string; priority: string; assignedToId: string; resolutionNote: string }>) {
    try {
      await api.patch(`/hr-helpdesk/${id}`, patch);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to update ticket');
    }
  }

  return (
    <AppShell>
      <div className="flex items-center justify-between">
        <h1 className="inline-block rounded-lg bg-brand-50 px-4 py-2 text-xl font-bold tracking-tight text-brand shadow-card">HR Helpdesk</h1>
        <button onClick={() => setShowForm((s) => !s)} className="rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-brand-700">
          {showForm ? 'Cancel' : 'New ticket'}
        </button>
      </div>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Raise a question for HR — IT access, payroll, benefits, or workplace issues.</p>
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      {showForm && (
        <form onSubmit={handleCreate} className="mt-4 grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-white dark:bg-slate-800 shadow-card transition-shadow hover:shadow-card-hover p-4 sm:grid-cols-2 lg:grid-cols-4">
          <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-900 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-100 transition-colors">
            {CATEGORY_OPTIONS.map((c) => <option key={c} value={c}>{c.replace('_', ' ')}</option>)}
          </select>
          <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} className="rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-900 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-100 transition-colors">
            {PRIORITY_OPTIONS.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
          <input required placeholder="Subject" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} className="rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-900 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-100 transition-colors sm:col-span-2 lg:col-span-2" />
          <textarea required placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-900 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-100 transition-colors sm:col-span-2 lg:col-span-4" rows={2} />
          <button type="submit" className="rounded-lg bg-brand px-3 py-2 text-sm font-medium text-white hover:bg-brand-dark sm:col-span-2 lg:col-span-4">
            Submit ticket
          </button>
        </form>
      )}

      <p className="mt-6 text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">My Tickets</p>
      <div className="mt-2 overflow-hidden bg-white dark:bg-slate-800">
        <table className="w-full text-sm">
          <thead className="bg-brand-50/60 text-left text-xs font-semibold uppercase tracking-wide text-brand-700 dark:bg-slate-900/40 dark:text-brand-300">
            <tr>
              <th className="px-4 py-2">Subject</th>
              <th className="px-4 py-2">Category</th>
              <th className="px-4 py-2">Priority</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">Created</th>
            </tr>
          </thead>
          <tbody>
            {mine.map((t) => (
              <tr key={t.id} className="border-t border-slate-100 dark:border-slate-700 align-top">
                <td className="px-4 py-2">
                  <p className="font-medium text-slate-800 dark:text-slate-100">{t.subject}</p>
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{t.description}</p>
                  {t.resolutionNote && <p className="mt-0.5 text-xs text-emerald-600">Resolution: {t.resolutionNote}</p>}
                </td>
                <td className="px-4 py-2 text-slate-500 dark:text-slate-400">{t.category.replace('_', ' ')}</td>
                <td className="px-4 py-2"><span className={`rounded-lg px-2 py-0.5 text-xs font-medium ${PRIORITY_COLORS[t.priority]}`}>{t.priority}</span></td>
                <td className="px-4 py-2"><span className={`rounded-lg px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[t.status]}`}>{t.status}</span></td>
                <td className="px-4 py-2 text-slate-500 dark:text-slate-400">{new Date(t.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
            {mine.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-6 text-center text-slate-400">No tickets raised yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {canManage && (
        <>
          <p className="mt-6 text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
            {me?.role === Role.BRANCH_MANAGER ? "Your Branch's Tickets" : 'All Tickets'}
          </p>
          <div className="mt-2 overflow-hidden bg-white dark:bg-slate-800">
            <table className="w-full text-sm">
              <thead className="bg-brand-50/60 text-left text-xs font-semibold uppercase tracking-wide text-brand-700 dark:bg-slate-900/40 dark:text-brand-300">
                <tr>
                  <th className="px-4 py-2">Subject</th>
                  <th className="px-4 py-2">Raised by</th>
                  <th className="px-4 py-2">Priority</th>
                  <th className="px-4 py-2">Assigned</th>
                  <th className="px-4 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {team.map((t) => {
                  const isAssignee = t.assignedToId === me?.id;
                  const canEdit = canManage || isAssignee;
                  return (
                    <tr key={t.id} className="border-t border-slate-100 dark:border-slate-700 align-top">
                      <td className="px-4 py-2">
                        <p className="font-medium text-slate-800 dark:text-slate-100">{t.subject}</p>
                        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{t.category.replace('_', ' ')} · {t.description}</p>
                      </td>
                      <td className="px-4 py-2 text-slate-500 dark:text-slate-400">{t.user?.name ?? '—'}</td>
                      <td className="px-4 py-2">
                        <select value={t.priority} onChange={(e) => handleUpdate(t.id, { priority: e.target.value })} className={`rounded-lg border-none px-2 py-0.5 text-xs font-medium ${PRIORITY_COLORS[t.priority]}`}>
                          {PRIORITY_OPTIONS.map((p) => <option key={p} value={p}>{p}</option>)}
                        </select>
                      </td>
                      <td className="px-4 py-2">
                        {canSeeAllUsers ? (
                          <select value={t.assignedToId ?? ''} onChange={(e) => handleUpdate(t.id, { assignedToId: e.target.value })} className="rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-900 px-2 py-1 text-xs">
                            <option value="">Unassigned</option>
                            {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                          </select>
                        ) : (
                          <span className="text-slate-500 dark:text-slate-400">{t.assignedTo?.name ?? '—'}</span>
                        )}
                      </td>
                      <td className="px-4 py-2">
                        {canEdit ? (
                          <select value={t.status} onChange={(e) => handleUpdate(t.id, { status: e.target.value })} className={`rounded-lg border-none px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[t.status]}`}>
                            {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                          </select>
                        ) : (
                          <span className={`rounded-lg px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[t.status]}`}>{t.status}</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {team.length === 0 && (
                  <tr><td colSpan={5} className="px-4 py-6 text-center text-slate-400">No tickets yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </AppShell>
  );
}
