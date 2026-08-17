'use client';

import { FormEvent, useEffect, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { useAuth } from '@/lib/auth-context';
import { api, ApiError } from '@/lib/api';
import { GrievanceCategory, Role, type GrievanceReportDTO } from '@holiday-vibez/shared';

const STATUS_OPTIONS = ['SUBMITTED', 'UNDER_REVIEW', 'RESOLVED'];

const STATUS_COLORS: Record<string, string> = {
  SUBMITTED: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  UNDER_REVIEW: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  RESOLVED: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
};

const CATEGORY_LABEL: Record<string, string> = {
  GENERAL_GRIEVANCE: 'General grievance',
  POSH_COMPLAINT: 'POSH complaint',
};

export default function GrievancesPage() {
  const { user: me } = useAuth();
  const canHandle = me?.role === Role.ADMIN || me?.role === Role.DIRECTOR;

  const [mine, setMine] = useState<GrievanceReportDTO[]>([]);
  const [queue, setQueue] = useState<GrievanceReportDTO[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ category: GrievanceCategory.GENERAL_GRIEVANCE as string, description: '', against: '' });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editNotes, setEditNotes] = useState('');

  async function load() {
    try {
      setMine(await api.get<GrievanceReportDTO[]>('/grievances/mine'));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load your reports');
    }
    if (canHandle) {
      try {
        setQueue(await api.get<GrievanceReportDTO[]>('/grievances'));
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'Failed to load the review queue');
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
    setNotice(null);
    try {
      await api.post('/grievances', { category: form.category, description: form.description, against: form.against || undefined });
      setForm({ category: GrievanceCategory.GENERAL_GRIEVANCE, description: '', against: '' });
      setShowForm(false);
      setNotice('Report submitted confidentially to Admin/Director.');
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to submit report');
    }
  }

  async function handleStatusChange(id: string, status: string) {
    try {
      await api.patch(`/grievances/${id}`, { status });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to update status');
    }
  }

  async function confirmNotes(id: string) {
    try {
      await api.patch(`/grievances/${id}`, { resolutionNotes: editNotes });
      setEditingId(null);
      setEditNotes('');
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to save notes');
    }
  }

  return (
    <AppShell>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold tracking-tight text-brand-700">Grievances &amp; POSH</h1>
        <button onClick={() => setShowForm((s) => !s)} className="rounded-xl bg-gradient-to-br from-brand-600 to-brand-500 px-3 py-1.5 text-sm font-semibold text-white shadow-md shadow-brand-500/25 transition hover:opacity-90">
          {showForm ? 'Cancel' : 'Report an issue'}
        </button>
      </div>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        Confidential — visible only to you and to Admin/Director, regardless of branch or reporting line.
      </p>
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      {notice && <p className="mt-3 text-sm text-emerald-600">{notice}</p>}

      {showForm && (
        <form onSubmit={handleCreate} className="mt-4 flex flex-col gap-3 rounded-xl border border-slate-200 bg-white dark:bg-slate-800 dark:border-slate-700 shadow-card transition-shadow hover:shadow-card-hover p-4">
          <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-900 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-100 transition-colors">
            <option value={GrievanceCategory.GENERAL_GRIEVANCE}>General grievance</option>
            <option value={GrievanceCategory.POSH_COMPLAINT}>POSH complaint</option>
          </select>
          <input placeholder="Against (optional — who this concerns)" value={form.against} onChange={(e) => setForm({ ...form, against: e.target.value })} className="rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-900 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-100 transition-colors" />
          <textarea required placeholder="Describe what happened" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-900 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-100 transition-colors" rows={4} />
          <button type="submit" className="self-start rounded-xl bg-gradient-to-br from-brand-600 to-brand-500 shadow-md shadow-brand-500/25 px-3 py-2 text-sm font-medium text-white hover:opacity-90">Submit</button>
        </form>
      )}

      <p className="mt-6 text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">My Reports</p>
      <div className="mt-2 overflow-hidden bg-white dark:bg-slate-800">
        <table className="w-full text-sm">
          <thead className="bg-brand-50/60 text-left text-xs font-semibold uppercase tracking-wide text-brand-700 dark:bg-slate-900/40 dark:text-brand-300">
            <tr>
              <th className="px-4 py-2">Category</th>
              <th className="px-4 py-2">Description</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">Submitted</th>
            </tr>
          </thead>
          <tbody>
            {mine.map((g) => (
              <tr key={g.id} className="border-t border-slate-100 dark:border-slate-700 align-top">
                <td className="px-4 py-2 font-medium text-slate-800 dark:text-slate-100">{CATEGORY_LABEL[g.category]}</td>
                <td className="px-4 py-2 text-slate-500 dark:text-slate-400">
                  {g.description}
                  {g.resolutionNotes && <p className="mt-0.5 text-xs text-emerald-600">Response: {g.resolutionNotes}</p>}
                </td>
                <td className="px-4 py-2"><span className={`rounded-lg px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[g.status]}`}>{g.status.replace('_', ' ')}</span></td>
                <td className="px-4 py-2 text-slate-500 dark:text-slate-400">{new Date(g.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
            {mine.length === 0 && (
              <tr><td colSpan={4} className="px-4 py-6 text-center text-slate-400">No reports on file.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {canHandle && (
        <>
          <p className="mt-6 text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Review Queue (Admin/Director only)</p>
          <div className="mt-2 overflow-hidden bg-white dark:bg-slate-800">
            <table className="w-full text-sm">
              <thead className="bg-brand-50/60 text-left text-xs font-semibold uppercase tracking-wide text-brand-700 dark:bg-slate-900/40 dark:text-brand-300">
                <tr>
                  <th className="px-4 py-2">Reported by</th>
                  <th className="px-4 py-2">Category</th>
                  <th className="px-4 py-2">Description</th>
                  <th className="px-4 py-2">Status</th>
                  <th className="px-4 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {queue.map((g) => (
                  <tr key={g.id} className="border-t border-slate-100 dark:border-slate-700 align-top">
                    <td className="px-4 py-2 font-medium text-slate-800 dark:text-slate-100">{g.user?.name ?? '—'}</td>
                    <td className="px-4 py-2 text-slate-500 dark:text-slate-400">{CATEGORY_LABEL[g.category]}</td>
                    <td className="px-4 py-2 text-slate-500 dark:text-slate-400">
                      {g.description}
                      {g.against && <p className="mt-0.5 text-xs text-slate-400">Against: {g.against}</p>}
                    </td>
                    <td className="px-4 py-2">
                      <select value={g.status} onChange={(e) => handleStatusChange(g.id, e.target.value)} className={`rounded-lg border-none px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[g.status]}`}>
                        {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                      </select>
                    </td>
                    <td className="px-4 py-2 text-right">
                      {editingId === g.id ? null : (
                        <button onClick={() => { setEditingId(g.id); setEditNotes(g.resolutionNotes ?? ''); }} className="text-brand hover:underline">
                          {g.resolutionNotes ? 'Edit notes' : 'Add notes'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {editingId && (
                  <tr className="border-t border-slate-100 bg-brand-50/40 dark:bg-slate-900/30">
                    <td colSpan={5} className="px-4 py-2.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <input
                          autoFocus
                          placeholder="Resolution notes"
                          value={editNotes}
                          onChange={(e) => setEditNotes(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && confirmNotes(editingId)}
                          className="flex-1 min-w-[200px] rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-900 px-3 py-1.5 text-sm focus:border-brand focus:outline-none"
                        />
                        <button onClick={() => confirmNotes(editingId)} className="rounded-xl bg-gradient-to-br from-brand-600 to-brand-500 shadow-md shadow-brand-500/25 px-3 py-1.5 text-sm font-medium text-white hover:opacity-90">Save</button>
                        <button onClick={() => setEditingId(null)} className="text-sm text-slate-500 hover:underline">Cancel</button>
                      </div>
                    </td>
                  </tr>
                )}
                {queue.length === 0 && (
                  <tr><td colSpan={5} className="px-4 py-6 text-center text-slate-400">Nothing in the queue.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </AppShell>
  );
}
