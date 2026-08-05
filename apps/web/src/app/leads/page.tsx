'use client';

import { ChangeEvent, FormEvent, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/AppShell';
import { useAuth } from '@/lib/auth-context';
import { api, ApiError, getAccessToken } from '@/lib/api';
import { LeadSource, LeadStatus, Role, type BranchDTO, type ClientDTO, type LeadSummaryDTO } from '@holiday-vibez/shared';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';

interface BulkImportRow {
  row: number;
  success: boolean;
  leadId?: string;
  error?: string;
}

const SOURCE_OPTIONS = [LeadSource.GOOGLE, LeadSource.META, LeadSource.WEBSITE, LeadSource.WHATSAPP, LeadSource.REFERRAL, LeadSource.WALKIN];
const STATUS_OPTIONS = Object.values(LeadStatus);

const STATUS_COLORS: Record<string, string> = {
  NEW: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
  HOT_LEAD: 'bg-orange-100 text-orange-700',
  CONFIRMED: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400',
  JUNK_NOT_INTERESTED: 'bg-slate-200 text-slate-600 dark:text-slate-300',
  POSTPONED: 'bg-slate-200 text-slate-600 dark:text-slate-300',
};

export default function LeadsPage() {
  const { user: me } = useAuth();
  const [leads, setLeads] = useState<LeadSummaryDTO[]>([]);
  const [branches, setBranches] = useState<BranchDTO[]>([]);
  const [clients, setClients] = useState<ClientDTO[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const canCreate = me?.role === Role.ADMIN || me?.role === Role.BRANCH_MANAGER;

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [importResults, setImportResults] = useState<BulkImportRow[] | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  const [form, setForm] = useState({
    source: LeadSource.WEBSITE as string,
    clientName: '',
    clientId: '',
    phone: '',
    email: '',
    destination: '',
    branchId: '',
  });

  async function load() {
    try {
      const [l, b, c] = await Promise.all([
        api.get<LeadSummaryDTO[]>('/leads'),
        api.get<BranchDTO[]>('/branches'),
        api.get<ClientDTO[]>('/clients'),
      ]);
      setLeads(l);
      setBranches(b);
      setClients(c);
      if (!form.branchId && b.length) setForm((f) => ({ ...f, branchId: b[0].id }));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load leads');
    }
  }

  function handleClientSelect(clientId: string) {
    const client = clients.find((c) => c.id === clientId);
    setForm((f) => ({ ...f, clientId, clientName: client ? client.name : f.clientName }));
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
      await api.post('/leads', { ...form, clientId: form.clientId || undefined, email: form.email || undefined });
      setForm({ source: LeadSource.WEBSITE, clientName: '', clientId: '', phone: '', email: '', destination: '', branchId: branches[0]?.id ?? '' });
      setShowForm(false);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to create lead');
    }
  }

  async function handleBulkImport(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportError(null);
    setImportResults(null);
    setImporting(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const token = getAccessToken();
      const res = await fetch(`${API_BASE}/leads/bulk-import`, {
        method: 'POST',
        credentials: 'include',
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        body: formData,
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({ message: res.statusText }));
        throw new ApiError(res.status, typeof body.message === 'string' ? body.message : JSON.stringify(body.message));
      }
      setImportResults(await res.json());
      await load();
    } catch (err) {
      setImportError(err instanceof ApiError ? err.message : 'Import failed');
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
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
        <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">Leads</h1>
        {canCreate && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={importing}
              className="rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-1.5 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50"
            >
              {importing ? 'Importing…' : 'Bulk import (CSV)'}
            </button>
            <input ref={fileInputRef} type="file" accept=".csv,text/csv" onChange={handleBulkImport} className="hidden" />
            <button onClick={() => setShowForm((s) => !s)} className="rounded-lg bg-gradient-to-r from-brand to-brand-500 px-3 py-1.5 text-sm font-medium text-white shadow-card transition-all hover:shadow-card-hover hover:brightness-105">
              {showForm ? 'Cancel' : 'Add lead'}
            </button>
          </div>
        )}
      </div>
      {canCreate && (
        <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
          CSV columns: source,clientName,phone,email,destination,branch — source must be one of {SOURCE_OPTIONS.join(', ')}; branch must match an existing branch name.
        </p>
      )}

      {error && <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>}
      {importError && <p className="mt-3 text-sm text-red-600 dark:text-red-400">{importError}</p>}
      {importResults && (
        <div className="mt-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-card transition-shadow hover:shadow-card-hover p-3 text-sm">
          <p className="font-medium text-slate-700 dark:text-slate-200">
            Imported {importResults.filter((r) => r.success).length} of {importResults.length} rows
          </p>
          <ul className="mt-2 space-y-1">
            {importResults.filter((r) => !r.success).map((r) => (
              <li key={r.row} className="text-red-600 dark:text-red-400">Row {r.row}: {r.error}</li>
            ))}
          </ul>
        </div>
      )}

      {canCreate && showForm && (
        <form onSubmit={handleCreate} className="mt-4 grid grid-cols-1 gap-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-card transition-shadow hover:shadow-card-hover p-4 sm:grid-cols-2 lg:grid-cols-3">
          <select value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} className="rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm">
            {SOURCE_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={form.branchId} onChange={(e) => setForm({ ...form, branchId: e.target.value })} className="rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm">
            {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
          <select value={form.clientId} onChange={(e) => handleClientSelect(e.target.value)} className="rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm">
            <option value="">Link to existing client (optional)</option>
            {clients.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.type})</option>)}
          </select>
          <input required placeholder="Client name" value={form.clientName} onChange={(e) => setForm({ ...form, clientName: e.target.value })} className="rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm" />
          <input required placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm" />
          <input type="email" placeholder="Email (optional)" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm" />
          <input required placeholder="Destination" value={form.destination} onChange={(e) => setForm({ ...form, destination: e.target.value })} className="rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm" />
          <button type="submit" className="rounded-lg bg-brand px-3 py-2 text-sm font-medium text-white hover:bg-brand-dark sm:col-span-2 lg:col-span-3">
            Create lead (auto-assigns via round-robin)
          </button>
        </form>
      )}

      <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-card transition-shadow hover:shadow-card-hover">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 dark:bg-slate-900 text-left text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
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
              <tr key={l.id} className="border-t border-slate-100 dark:border-slate-800">
                <td className="px-4 py-2 font-medium text-slate-800 dark:text-slate-100">{l.clientName}<div className="text-xs text-slate-400 dark:text-slate-500">{l.phone}</div></td>
                <td className="px-4 py-2">{l.destination}</td>
                <td className="px-4 py-2">{branchName(l.branchId)}</td>
                <td className="px-4 py-2">{l.source}</td>
                <td className="px-4 py-2">
                  {l.slaBreached ? <span className="rounded-full bg-red-100 dark:bg-red-900/30 px-2 py-0.5 text-xs font-medium text-red-700 dark:text-red-400">Breached</span> : <span className="text-xs text-slate-400 dark:text-slate-500">OK</span>}
                </td>
                <td className="px-4 py-2">
                  <select
                    value={l.status}
                    onChange={(e) => handleStatusChange(l.id, e.target.value)}
                    className={`rounded-full border-none px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[l.status] ?? 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}`}
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
              <tr><td colSpan={7} className="px-4 py-6 text-center text-slate-400 dark:text-slate-500">No leads yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}
