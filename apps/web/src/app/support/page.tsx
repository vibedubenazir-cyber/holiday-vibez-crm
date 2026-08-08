'use client';

import { FormEvent, useEffect, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { useAuth } from '@/lib/auth-context';
import { api, ApiError } from '@/lib/api';
import { Role, type SupportTicketDTO, type LeadSummaryDTO, type UserDTO } from '@holiday-vibez/shared';

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

export default function SupportPage() {
  const { user: me } = useAuth();
  const canManage = me?.role === Role.ADMIN || me?.role === Role.DIRECTOR || me?.role === Role.BRANCH_MANAGER;

  const [tickets, setTickets] = useState<SupportTicketDTO[]>([]);
  const [leads, setLeads] = useState<LeadSummaryDTO[]>([]);
  const [users, setUsers] = useState<UserDTO[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [form, setForm] = useState({ leadId: '', subject: '', description: '', priority: 'MEDIUM', assignedToId: '' });

  async function load() {
    try {
      setTickets(await api.get<SupportTicketDTO[]>(`/support-tickets${statusFilter ? `?status=${statusFilter}` : ''}`));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load tickets');
    }
    try {
      setLeads(await api.get<LeadSummaryDTO[]>('/leads'));
    } catch {
      // non-fatal — leads list is only needed for the create form
    }
    if (canManage) {
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
  }, [me?.role, statusFilter]);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api.post(`/support-tickets/lead/${form.leadId}`, {
        subject: form.subject,
        description: form.description,
        priority: form.priority,
        assignedToId: form.assignedToId || undefined,
      });
      setForm({ leadId: '', subject: '', description: '', priority: 'MEDIUM', assignedToId: '' });
      setShowForm(false);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to create ticket');
    }
  }

  async function handleUpdate(id: string, patch: Partial<{ status: string; priority: string; assignedToId: string }>) {
    try {
      await api.patch(`/support-tickets/${id}`, patch);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to update ticket');
    }
  }

  return (
    <AppShell>
      <div className="flex items-center justify-between">
        <h1 className="inline-block rounded-lg bg-brand-50 px-4 py-2 text-xl font-bold tracking-tight text-brand shadow-card">Support Tickets</h1>
        <button onClick={() => setShowForm((s) => !s)} className="rounded-lg bg-gradient-to-r from-brand to-brand-500 px-3 py-1.5 text-sm font-medium text-white shadow-card transition-all hover:shadow-card-hover hover:brightness-105">
          {showForm ? 'Cancel' : 'New ticket'}
        </button>
      </div>
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      {showForm && (
        <form onSubmit={handleCreate} className="mt-4 grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-brand-50 shadow-card transition-shadow hover:shadow-card-hover p-4 sm:grid-cols-2 lg:grid-cols-4">
          <select required value={form.leadId} onChange={(e) => setForm({ ...form, leadId: e.target.value })} className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-100 transition-colors">
            <option value="">Select lead…</option>
            {leads.map((l) => <option key={l.id} value={l.id}>{l.clientName} · {l.destination}</option>)}
          </select>
          <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-100 transition-colors">
            {PRIORITY_OPTIONS.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
          {canManage && (
            <select value={form.assignedToId} onChange={(e) => setForm({ ...form, assignedToId: e.target.value })} className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-100 transition-colors">
              <option value="">Unassigned</option>
              {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          )}
          <input required placeholder="Subject" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-100 transition-colors sm:col-span-2 lg:col-span-1" />
          <textarea required placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-100 transition-colors sm:col-span-2 lg:col-span-4" rows={2} />
          <button type="submit" className="rounded-lg bg-brand px-3 py-2 text-sm font-medium text-white hover:bg-brand-dark sm:col-span-2 lg:col-span-4">
            Create ticket
          </button>
        </form>
      )}

      <div className="mt-4 flex items-center gap-2">
        <span className="text-sm text-blue-100">Filter:</span>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-100 transition-colors">
          <option value="">All statuses</option>
          {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <div className="mt-2 overflow-hidden bg-brand-50">
        <table className="w-full text-sm">
          <thead className="bg-brand-50/60 text-left text-xs font-semibold uppercase tracking-wide text-brand-700">
            <tr>
              <th className="px-4 py-2">Subject</th>
              <th className="px-4 py-2">Lead</th>
              <th className="px-4 py-2">Priority</th>
              <th className="px-4 py-2">Assigned</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">Created</th>
            </tr>
          </thead>
          <tbody>
            {tickets.map((t) => {
              const isAssignee = t.assignedToId === me?.id;
              const canEdit = canManage || isAssignee;
              return (
                <tr key={t.id} className="border-t border-slate-100 align-top">
                  <td className="px-4 py-2">
                    <p className="font-medium text-slate-800">{t.subject}</p>
                    <p className="mt-0.5 text-xs text-slate-500">{t.description}</p>
                    {t.resolutionNote && <p className="mt-0.5 text-xs text-emerald-600">Resolution: {t.resolutionNote}</p>}
                  </td>
                  <td className="px-4 py-2 text-slate-500">{(t as any).lead?.clientName ?? '—'}</td>
                  <td className="px-4 py-2">
                    {canManage ? (
                      <select value={t.priority} onChange={(e) => handleUpdate(t.id, { priority: e.target.value })} className={`rounded-lg border-none px-2 py-0.5 text-xs font-medium ${PRIORITY_COLORS[t.priority]}`}>
                        {PRIORITY_OPTIONS.map((p) => <option key={p} value={p}>{p}</option>)}
                      </select>
                    ) : (
                      <span className={`rounded-lg px-2 py-0.5 text-xs font-medium ${PRIORITY_COLORS[t.priority]}`}>{t.priority}</span>
                    )}
                  </td>
                  <td className="px-4 py-2">
                    {canManage ? (
                      <select value={t.assignedToId ?? ''} onChange={(e) => handleUpdate(t.id, { assignedToId: e.target.value })} className="rounded-lg border border-slate-300 px-2 py-1 text-xs">
                        <option value="">Unassigned</option>
                        {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                      </select>
                    ) : (
                      <span className="text-slate-500">{(t as any).assignedTo?.name ?? '—'}</span>
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
                  <td className="px-4 py-2 text-slate-500">{new Date(t.createdAt).toLocaleDateString()}</td>
                </tr>
              );
            })}
            {tickets.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-6 text-center text-slate-400">No support tickets yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}
