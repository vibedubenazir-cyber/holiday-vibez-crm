'use client';

import { ChangeEvent, FormEvent, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/AppShell';
import { BadgeDropdown, type BadgeDropdownOption } from '@/components/BadgeDropdown';
import { PhoneInput } from '@/components/PhoneInput';
import { useAuth } from '@/lib/auth-context';
import { api, ApiError, getAccessToken } from '@/lib/api';
import { LeadSource, LeadStatus, LeadTemperature, Role, type BranchDTO, type ClientDTO, type LeadSummaryDTO } from '@holiday-vibez/shared';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';

interface BulkImportRow {
  row: number;
  success: boolean;
  leadId?: string;
  error?: string;
}

const SOURCE_OPTIONS = [
  LeadSource.WHATSAPP,
  LeadSource.INSTAGRAM,
  LeadSource.FACEBOOK,
  LeadSource.WEBSITE,
  LeadSource.GOOGLE,
  LeadSource.WALKIN,
  LeadSource.REFERRAL,
  LeadSource.EXISTING_CUSTOMER,
  LeadSource.AGENT_B2B,
  LeadSource.PHONE_CALL,
];
const MEAL_PREFERENCE_OPTIONS = ['Veg', 'Non-veg', 'Jain', 'Any'];
const STATUS_OPTIONS = Object.values(LeadStatus);

// Each pipeline stage gets its own solid color so a row's status is readable
// at a glance instead of every stage rendering as the same pale pill.
const STATUS_COLORS: Record<string, string> = {
  NEW: 'bg-blue-500 text-white',
  PROPOSAL_SENT: 'bg-indigo-500 text-white',
  NO_CONNECT: 'bg-amber-500 text-white',
  HOT_LEAD: 'bg-red-500 text-white',
  PROPOSAL_CONFIRMED: 'bg-teal-500 text-white',
  PLAN_DROPPED: 'bg-slate-400 text-white',
  FOLLOW_UP: 'bg-amber-500 text-white',
  CONFIRMED: 'bg-emerald-500 text-white',
  POSTPONED: 'bg-slate-400 text-white',
  JUNK_NOT_INTERESTED: 'bg-slate-400 text-white',
};

const STATUS_DOT_COLORS: Record<string, string> = {
  NEW: 'bg-blue-500',
  PROPOSAL_SENT: 'bg-indigo-500',
  NO_CONNECT: 'bg-amber-500',
  HOT_LEAD: 'bg-red-500',
  PROPOSAL_CONFIRMED: 'bg-teal-500',
  PLAN_DROPPED: 'bg-slate-400',
  FOLLOW_UP: 'bg-amber-500',
  CONFIRMED: 'bg-emerald-500',
  POSTPONED: 'bg-slate-400',
  JUNK_NOT_INTERESTED: 'bg-slate-400',
};

const STATUS_DROPDOWN_OPTIONS: BadgeDropdownOption[] = STATUS_OPTIONS.map((s) => ({
  value: s,
  label: s.replaceAll('_', ' '),
  colorClass: STATUS_COLORS[s] ?? 'bg-slate-100 text-slate-600',
  dotClass: STATUS_DOT_COLORS[s] ?? 'bg-slate-400',
}));

const TEMPERATURE_OPTIONS = [LeadTemperature.HOT, LeadTemperature.WARM, LeadTemperature.COLD];

// Hot = act now (red), Warm = worth nurturing (orange), Cold = low urgency (green) —
// independent of pipeline status, this is a consultant's own read on lead urgency.
const TEMPERATURE_COLORS: Record<string, string> = {
  HOT: 'bg-red-500 text-white',
  WARM: 'bg-orange-500 text-white',
  COLD: 'bg-emerald-500 text-white',
};

const TEMPERATURE_DOT_COLORS: Record<string, string> = {
  HOT: 'bg-red-500',
  WARM: 'bg-orange-500',
  COLD: 'bg-emerald-500',
};

const TEMPERATURE_DROPDOWN_OPTIONS: BadgeDropdownOption[] = TEMPERATURE_OPTIONS.map((t) => ({
  value: t,
  label: t.charAt(0) + t.slice(1).toLowerCase(),
  colorClass: TEMPERATURE_COLORS[t],
  dotClass: TEMPERATURE_DOT_COLORS[t],
}));

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

  const emptyForm = {
    source: LeadSource.WEBSITE as string,
    clientName: '',
    clientId: '',
    phone: '',
    email: '',
    destination: '',
    branchId: '',
    travelDate: '',
    adultsCount: '',
    childrenCount: '',
    childrenAges: '',
    hotelCategory: '',
    mealPreference: '',
    transportRequired: false,
    visaRequired: false,
    flightRequired: false,
    insuranceRequired: false,
  };
  const [form, setForm] = useState(emptyForm);

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
      await api.post('/leads', {
        ...form,
        clientId: form.clientId || undefined,
        email: form.email || undefined,
        travelDate: form.travelDate || undefined,
        adultsCount: form.adultsCount ? Number(form.adultsCount) : undefined,
        childrenCount: form.childrenCount ? Number(form.childrenCount) : undefined,
        childrenAges: form.childrenAges || undefined,
        hotelCategory: form.hotelCategory ? Number(form.hotelCategory) : undefined,
        mealPreference: form.mealPreference || undefined,
      });
      setForm({ ...emptyForm, branchId: branches[0]?.id ?? '' });
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

  async function handleTemperatureChange(id: string, temperature: string) {
    try {
      await api.patch(`/leads/${id}`, { temperature });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to update lead');
    }
  }

  return (
    <AppShell>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold tracking-tight text-brand-700">Leads</h1>
        {canCreate && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={importing}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              {importing ? 'Importing…' : 'Bulk import (CSV)'}
            </button>
            <input ref={fileInputRef} type="file" accept=".csv,text/csv" onChange={handleBulkImport} className="hidden" />
            <button onClick={() => setShowForm((s) => !s)} className="rounded-xl bg-gradient-to-br from-brand-600 to-brand-500 px-3 py-1.5 text-sm font-semibold text-white shadow-md shadow-brand-500/25 transition hover:opacity-90">
              {showForm ? 'Cancel' : 'Add lead'}
            </button>
          </div>
        )}
      </div>
      {canCreate && (
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          CSV columns: source,clientName,phone,email,destination,branch — source must be one of {SOURCE_OPTIONS.join(', ')}; branch must match an existing branch name.
        </p>
      )}
      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
        SLA: whether this lead was contacted within the required response-time window. "Breached" means it wasn't — follow up as soon as possible.
      </p>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      {importError && <p className="mt-3 text-sm text-red-600">{importError}</p>}
      {importResults && (
        <div className="mt-3 rounded-xl border border-slate-200 bg-white dark:bg-slate-800 shadow-card transition-shadow hover:shadow-card-hover p-3 text-sm">
          <p className="font-medium text-slate-700">
            Imported {importResults.filter((r) => r.success).length} of {importResults.length} rows
          </p>
          <ul className="mt-2 space-y-1">
            {importResults.filter((r) => !r.success).map((r) => (
              <li key={r.row} className="text-red-600">Row {r.row}: {r.error}</li>
            ))}
          </ul>
        </div>
      )}

      {canCreate && showForm && (
        <form onSubmit={handleCreate} className="mt-4 grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-white dark:bg-slate-800 shadow-card transition-shadow hover:shadow-card-hover p-4 sm:grid-cols-2 lg:grid-cols-3">
          <select value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-100 transition-colors">
            {SOURCE_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={form.branchId} onChange={(e) => setForm({ ...form, branchId: e.target.value })} className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-100 transition-colors">
            {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
          <select value={form.clientId} onChange={(e) => handleClientSelect(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-100 transition-colors">
            <option value="">Link to existing client (optional)</option>
            {clients.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.type})</option>)}
          </select>
          <input required placeholder="Client name" value={form.clientName} onChange={(e) => setForm({ ...form, clientName: e.target.value })} className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-100 transition-colors" />
          <PhoneInput required value={form.phone} onChange={(phone) => setForm({ ...form, phone })} />
          <input type="email" placeholder="Email (optional)" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-100 transition-colors" />
          <input required placeholder="Destination" value={form.destination} onChange={(e) => setForm({ ...form, destination: e.target.value })} className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-100 transition-colors" />

          <p className="sm:col-span-2 lg:col-span-3 mt-1 text-xs font-medium uppercase tracking-wide text-slate-400">Travel Requirement</p>
          <input type="date" placeholder="Travel date" value={form.travelDate} onChange={(e) => setForm({ ...form, travelDate: e.target.value })} className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-100 transition-colors" />
          <input type="number" min={0} placeholder="No. of adults" value={form.adultsCount} onChange={(e) => setForm({ ...form, adultsCount: e.target.value })} className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-100 transition-colors" />
          <input type="number" min={0} placeholder="No. of children" value={form.childrenCount} onChange={(e) => setForm({ ...form, childrenCount: e.target.value })} className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-100 transition-colors" />
          <input placeholder="Children ages (e.g. 5, 8)" value={form.childrenAges} onChange={(e) => setForm({ ...form, childrenAges: e.target.value })} className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-100 transition-colors" />
          <select value={form.hotelCategory} onChange={(e) => setForm({ ...form, hotelCategory: e.target.value })} className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-100 transition-colors">
            <option value="">Hotel category</option>
            {[3, 4, 5].map((n) => <option key={n} value={n}>{n}-star</option>)}
          </select>
          <select value={form.mealPreference} onChange={(e) => setForm({ ...form, mealPreference: e.target.value })} className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-100 transition-colors">
            <option value="">Meal preference</option>
            {MEAL_PREFERENCE_OPTIONS.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
          <div className="flex flex-wrap items-center gap-4 sm:col-span-2 lg:col-span-3 text-sm text-slate-600 dark:text-slate-300">
            <label className="flex items-center gap-1.5">
              <input type="checkbox" checked={form.transportRequired} onChange={(e) => setForm({ ...form, transportRequired: e.target.checked })} /> Transport
            </label>
            <label className="flex items-center gap-1.5">
              <input type="checkbox" checked={form.visaRequired} onChange={(e) => setForm({ ...form, visaRequired: e.target.checked })} /> Visa
            </label>
            <label className="flex items-center gap-1.5">
              <input type="checkbox" checked={form.flightRequired} onChange={(e) => setForm({ ...form, flightRequired: e.target.checked })} /> Flight
            </label>
            <label className="flex items-center gap-1.5">
              <input type="checkbox" checked={form.insuranceRequired} onChange={(e) => setForm({ ...form, insuranceRequired: e.target.checked })} /> Insurance
            </label>
          </div>

          <button type="submit" className="rounded-xl bg-gradient-to-br from-brand-600 to-brand-500 shadow-md shadow-brand-500/25 px-3 py-2 text-sm font-medium text-white hover:opacity-90 sm:col-span-2 lg:col-span-3">
            Create lead (auto-assigns via round-robin)
          </button>
        </form>
      )}

      <div className="mt-4 overflow-hidden rounded-xl bg-white shadow-card dark:bg-slate-800">
        <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-brand-50/60 text-left text-xs font-semibold uppercase tracking-wide text-brand-700 dark:bg-slate-900/40 dark:text-brand-300">
            <tr>
              <th className="px-4 py-3">Client</th>
              <th className="px-4 py-3">Destination</th>
              <th className="px-4 py-3">Branch</th>
              <th className="px-4 py-3">Source</th>
              <th className="px-4 py-3">Entry Date</th>
              <th className="px-4 py-3" title="Whether this lead was contacted within the required response-time window">SLA</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3" title="How likely/urgent this lead is to convert">Priority</th>
              <th className="px-4 py-3 text-right">Quotation</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
            {leads.map((l) => (
              <tr key={l.id} className="transition-colors hover:bg-slate-50 dark:hover:bg-slate-700/50">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-semibold text-brand-700 dark:bg-brand-500/20 dark:text-brand-300">
                      {initials(l.clientName)}
                    </div>
                    <div>
                      <p className="font-medium text-slate-800 dark:text-slate-100">{l.clientName}</p>
                      <p className="text-xs text-slate-400">{l.phone}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{l.destination}</td>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{branchName(l.branchId)}</td>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{l.source}</td>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{new Date(l.createdAt).toLocaleDateString()}</td>
                <td className="px-4 py-3">
                  {l.slaBreached ? (
                    <span title="Not contacted within the required response-time window" className="inline-flex w-[90px] items-center justify-center whitespace-nowrap rounded-lg bg-red-500 px-3 py-1.5 text-xs font-bold text-white shadow-sm">
                      Breached
                    </span>
                  ) : (
                    <span title="Contacted within the required response-time window" className="inline-flex w-[90px] items-center justify-center whitespace-nowrap rounded-lg bg-blue-500 px-3 py-1.5 text-xs font-bold text-white shadow-sm">
                      On time
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <BadgeDropdown
                    value={l.status}
                    options={STATUS_DROPDOWN_OPTIONS}
                    onChange={(v) => handleStatusChange(l.id, v)}
                    triggerClassName="w-[170px]"
                  />
                </td>
                <td className="px-4 py-3">
                  <BadgeDropdown
                    value={l.temperature}
                    options={TEMPERATURE_DROPDOWN_OPTIONS}
                    onChange={(v) => handleTemperatureChange(l.id, v)}
                    triggerClassName="w-[90px]"
                  />
                </td>
                <td className="px-4 py-3 text-right">
                  <Link href={`/leads/${l.id}`} className="font-medium text-brand hover:underline">Open</Link>
                </td>
              </tr>
            ))}
            {leads.length === 0 && (
              <tr><td colSpan={9} className="px-4 py-6 text-center text-slate-400">No leads yet.</td></tr>
            )}
          </tbody>
        </table>
        </div>
      </div>
    </AppShell>
  );
}

function initials(name: string) {
  return name
    .split(' ')
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}
