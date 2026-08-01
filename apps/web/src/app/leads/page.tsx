'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/AppShell';
import { useAuth } from '@/lib/auth-context';
import { api, ApiError } from '@/lib/api';
import { LeadSource, LeadStatus, Role, type BranchDTO, type LeadSummaryDTO } from '@holiday-vibez/shared';

const SOURCE_OPTIONS = [LeadSource.GOOGLE, LeadSource.META, LeadSource.WEBSITE, LeadSource.WHATSAPP, LeadSource.REFERRAL, LeadSource.WALKIN];
const STATUS_OPTIONS = Object.values(LeadStatus);

const STATUS_COLORS: Record<string, string> = {
  NEW: 'bg-blue-100 text-blue-700',
  HOT_LEAD: 'bg-orange-100 text-orange-700',
  CONFIRMED: 'bg-emerald-100 text-emerald-700',
  JUNK_NOT_INTERESTED: 'bg-slate-200 text-slate-600',
  POSTPONED: 'bg-slate-200 text-slate-600',
};

export default function LeadsPage() {
  const { user: me } = useAuth();
  const [leads, setLeads] = useState<LeadSummaryDTO[]>([]);
  const [branches, setBranches] = useState<BranchDTO[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const canCreate = me?.role === Role.ADMIN || me?.role === Role.BRANCH_MANAGER;

  const [form, setForm] = useState({
    source: LeadSource.WEBSITE as string,
    clientName: '',
    phone: '',
    email: '',
    destination: '',
    branchId: '',
  });

  async function load() {
    try {
      const [l, b] = await Promise.all([api.get<LeadSummaryDTO[]>('/leads'), api.get<BranchDTO[]>('/branches')]);
      setLeads(l);
      setBranches(b);
      if (!form.branchId && b.length) setForm((f) => ({ ...f, branchId: b[0].id }));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load leads');
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function branchName(id: string) {
    return branches.find((b) => b.id === id)?.name ?? id;
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api.post('/leads', { ...form, email: form.email || undefined });
      setForm({ source: LeadSource.WEBSITE, clientName: '', phone: '', email: '', destination: '', branchId: branches[0]?.id ?? '' });
      setShowForm(false);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to create lead');
    }
  }

  async function handleStatusChange(id: string, status: string) {
    try {
      await api.patch(`/leads/${id}`, { status });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to update lead');
    }
  }

  return (
    <AppShell>
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-slate-800">Leads</h1>
        {canCreate && (
          <button onClick={() => setShowForm((s) => !s)} className="rounded-md bg-brand px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-dark">
            {showForm ? 'Cancel' : 'Add lead'}
          </button>
        )}
      </div>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      {canCreate && showForm && (
        <form onSubmit={handleCreate} className="mt-4 grid grid-cols-1 gap-3 rounded-lg border border-slate-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-3">
          <select value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} className="rounded-md border border-slate-300 px-3 py-2 text-sm">
            {SOURCE_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={form.branchId} onChange={(e) => setForm({ ...form, branchId: e.target.value })} className="rounded-md border border-slate-300 px-3 py-2 text-sm">
            {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
          <input required placeholder="Client name" value={form.clientName} onChange={(e) => setForm({ ...form, clientName: e.target.value })} className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
          <input required placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
          <input type="email" placeholder="Email (optional)" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
          <input required placeholder="Destination" value={form.destination} onChange={(e) => setForm({ ...form, destination: e.target.value })} className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
          <button type="submit" className="rounded-md bg-brand px-3 py-2 text-sm font-medium text-white hover:bg-brand-dark sm:col-span-2 lg:col-span-3">
            Create lead (auto-assigns via round-robin)
          </button>
        </form>
      )}

      <div className="mt-4 overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-2">Client</th>
              <th className="px-4 py-2">Destination</th>
              <th className="px-4 py-2">Branch</th>
              <th className="px-4 py-2">Source</th>
              <th className="px-4 py-2">SLA</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2 text-right">Quotation</th>
            </tr>
          </thead>
          <tbody>
            {leads.map((l) => (
              <tr key={l.id} className="border-t border-slate-100">
                <td className="px-4 py-2 font-medium text-slate-800">{l.clientName}<div className="text-xs text-slate-400">{l.phone}</div></td>
                <td className="px-4 py-2">{l.destination}</td>
                <td className="px-4 py-2">{branchName(l.branchId)}</td>
                <td className="px-4 py-2">{l.source}</td>
                <td className="px-4 py-2">
                  {l.slaBreached ? <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">Breached</span> : <span className="text-xs text-slate-400">OK</span>}
                </td>
                <td className="px-4 py-2">
                  <select
                    value={l.status}
                    onChange={(e) => handleStatusChange(l.id, e.target.value)}
                    className={`rounded-full border-none px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[l.status] ?? 'bg-slate-100 text-slate-600'}`}
                  >
                    {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </td>
                <td className="px-4 py-2 text-right">
                  <Link href={`/leads/${l.id}`} className="text-brand hover:underline">Open</Link>
                </td>
              </tr>
            ))}
            {leads.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-6 text-center text-slate-400">No leads yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}
