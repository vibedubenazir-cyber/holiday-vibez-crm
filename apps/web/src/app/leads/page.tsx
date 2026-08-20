'use client';

import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  Plus,
  ChevronDown,
  Download,
  Upload,
  FileOutput,
  RefreshCw,
  Filter as FilterIcon,
  Eye,
  Mail,
  MessageCircle,
  Pencil,
  X,
  Sparkles,
  PhoneOff,
  Send,
  Flame,
  FileCheck2,
  BellRing,
  PauseCircle,
  CheckCircle2,
  XCircle,
  Trash2,
  Layers,
  type LucideIcon,
} from 'lucide-react';
import { AppShell } from '@/components/AppShell';
import { BadgeDropdown, type BadgeDropdownOption } from '@/components/BadgeDropdown';
import { PhoneInput } from '@/components/PhoneInput';
import { useAuth } from '@/lib/auth-context';
import { api, ApiError, getAccessToken } from '@/lib/api';
import {
  LeadSource,
  LeadStatus,
  LeadTemperature,
  Role,
  type BranchDTO,
  type ClientDTO,
  type ConsultantOptionDTO,
  type LeadSummaryDTO,
} from '@holiday-vibez/shared';

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

const STATUS_META: Record<LeadStatus, { label: string; icon: LucideIcon; tile: string }> = {
  [LeadStatus.NEW]: { label: 'New', icon: Sparkles, tile: 'from-sky-500 to-sky-600' },
  [LeadStatus.NO_CONNECT]: { label: 'No Connect', icon: PhoneOff, tile: 'from-slate-400 to-slate-500' },
  [LeadStatus.PROPOSAL_SENT]: { label: 'Proposal Sent', icon: Send, tile: 'from-indigo-500 to-indigo-600' },
  [LeadStatus.HOT_LEAD]: { label: 'Hot Lead', icon: Flame, tile: 'from-red-500 to-red-600' },
  [LeadStatus.PROPOSAL_CONFIRMED]: { label: 'Proposal Confirmed', icon: FileCheck2, tile: 'from-teal-500 to-teal-600' },
  [LeadStatus.FOLLOW_UP]: { label: 'Follow Up', icon: BellRing, tile: 'from-amber-500 to-amber-600' },
  [LeadStatus.POSTPONED]: { label: 'Postponed', icon: PauseCircle, tile: 'from-purple-500 to-purple-600' },
  [LeadStatus.CONFIRMED]: { label: 'Confirmed', icon: CheckCircle2, tile: 'from-emerald-500 to-emerald-600' },
  [LeadStatus.PLAN_DROPPED]: { label: 'Plan Dropped', icon: XCircle, tile: 'from-rose-500 to-rose-600' },
  [LeadStatus.JUNK_NOT_INTERESTED]: { label: 'Junk / Not Interested', icon: Trash2, tile: 'from-zinc-400 to-zinc-500' },
};

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

function shortId(id: string): string {
  return id.replace(/-/g, '').slice(0, 6).toUpperCase();
}

function csvEscape(v: string): string {
  return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

function downloadCsv(filename: string, rows: string[][]) {
  const csv = rows.map((r) => r.map(csvEscape).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function LeadsPage() {
  const { user: me } = useAuth();
  const [leads, setLeads] = useState<LeadSummaryDTO[]>([]);
  const [branches, setBranches] = useState<BranchDTO[]>([]);
  const [clients, setClients] = useState<ClientDTO[]>([]);
  const [consultants, setConsultants] = useState<ConsultantOptionDTO[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const canCreate = me?.role === Role.ADMIN || me?.role === Role.BRANCH_MANAGER;
  const canAssign = canCreate;

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [importResults, setImportResults] = useState<BulkImportRow[] | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [optionsOpen, setOptionsOpen] = useState(false);

  // --- Filters ---------------------------------------------------------
  const [filterOpen, setFilterOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<LeadStatus | null>(null);
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [consultantFilter, setConsultantFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [branchFilter, setBranchFilter] = useState('');

  // --- Status-note inline editor ----------------------------------------
  const [editingNoteFor, setEditingNoteFor] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState('');

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
    setLoading(true);
    try {
      const calls: [Promise<LeadSummaryDTO[]>, Promise<BranchDTO[]>, Promise<ClientDTO[]>, Promise<ConsultantOptionDTO[]>] = [
        api.get<LeadSummaryDTO[]>('/leads'),
        api.get<BranchDTO[]>('/branches'),
        api.get<ClientDTO[]>('/clients'),
        canAssign ? api.get<ConsultantOptionDTO[]>('/leads/consultants') : Promise.resolve([]),
      ];
      const [l, b, c, cons] = await Promise.all(calls);
      setLeads(l);
      setBranches(b);
      setClients(c);
      setConsultants(cons);
      if (!form.branchId && b.length) setForm((f) => ({ ...f, branchId: b[0].id }));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load leads');
    } finally {
      setLoading(false);
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

  function handleDownloadCsvFormat() {
    downloadCsv('leads-import-format.csv', [
      ['source', 'clientName', 'phone', 'email', 'destination', 'branch'],
      ['WEBSITE', 'Jane Doe', '+919812345678', 'jane@example.com', 'Goa', branches[0]?.name ?? 'Mumbai'],
    ]);
    setOptionsOpen(false);
  }

  function handleExportData() {
    const header = ['ID', 'Client', 'Phone', 'Email', 'Destination', 'Branch', 'Source', 'Tour Date', 'Package', 'Assigned To', 'Status', 'Status Note', 'Priority', 'Entry Date'];
    const rows = filteredLeads.map((l) => [
      shortId(l.id),
      l.clientName,
      l.phone,
      l.email ?? '',
      l.destination,
      branchName(l.branchId),
      l.source,
      l.travelDate ? new Date(l.travelDate).toLocaleDateString('en-IN') : '',
      l.packageLabel ?? '',
      l.assignedConsultantName ?? '',
      l.status,
      l.statusNote ?? '',
      l.temperature,
      new Date(l.createdAt).toLocaleDateString('en-IN'),
    ]);
    downloadCsv(`leads-export-${new Date().toISOString().slice(0, 10)}.csv`, [header, ...rows]);
    setOptionsOpen(false);
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

  async function handleAssignChange(id: string, consultantId: string) {
    try {
      await api.post(`/leads/${id}/assign`, consultantId ? { consultantId } : {});
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to reassign lead');
    }
  }

  function startEditNote(lead: LeadSummaryDTO) {
    setEditingNoteFor(lead.id);
    setNoteDraft(lead.statusNote ?? '');
  }

  async function saveNote(id: string) {
    try {
      await api.patch(`/leads/${id}`, { statusNote: noteDraft.trim() || null });
      setEditingNoteFor(null);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to save note');
    }
  }

  function clearFilters() {
    setStatusFilter(null);
    setSearch('');
    setDateFrom('');
    setDateTo('');
    setConsultantFilter('');
    setSourceFilter('');
    setBranchFilter('');
  }

  const statusCounts = useMemo(() => {
    const counts = new Map<LeadStatus, number>();
    leads.forEach((l) => counts.set(l.status, (counts.get(l.status) ?? 0) + 1));
    return counts;
  }, [leads]);

  const filteredLeads = useMemo(() => {
    const term = search.trim().toLowerCase();
    return leads.filter((l) => {
      if (statusFilter && l.status !== statusFilter) return false;
      if (consultantFilter && l.assignedConsultantId !== consultantFilter) return false;
      if (sourceFilter && l.source !== sourceFilter) return false;
      if (branchFilter && l.branchId !== branchFilter) return false;
      if (dateFrom && new Date(l.createdAt) < new Date(dateFrom)) return false;
      if (dateTo && new Date(l.createdAt) > new Date(new Date(dateTo).getTime() + 24 * 60 * 60 * 1000 - 1)) return false;
      if (term) {
        const hay = `${shortId(l.id)} ${l.clientName} ${l.email ?? ''} ${l.phone}`.toLowerCase();
        if (!hay.includes(term)) return false;
      }
      return true;
    });
  }, [leads, statusFilter, consultantFilter, sourceFilter, branchFilter, dateFrom, dateTo, search]);

  const filtersActive = !!(statusFilter || search || dateFrom || dateTo || consultantFilter || sourceFilter || branchFilter);

  return (
    <AppShell>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold tracking-tight text-brand-700">Leads</h1>
        <div className="flex flex-wrap items-center gap-2">
          {canCreate && (
            <button onClick={() => setShowForm((s) => !s)} className="flex items-center gap-1.5 rounded-xl bg-gradient-to-br from-brand-600 to-brand-500 px-3 py-1.5 text-sm font-semibold text-white shadow-md shadow-brand-500/25 transition hover:opacity-90">
              <Plus className="h-4 w-4" /> {showForm ? 'Cancel' : 'Add New'}
            </button>
          )}
          {canCreate && (
            <div className="relative">
              <button onClick={() => setOptionsOpen((o) => !o)} className="flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800">
                Options <ChevronDown className="h-3.5 w-3.5" />
              </button>
              {optionsOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setOptionsOpen(false)} />
                  <div className="absolute left-0 z-20 mt-1 w-48 rounded-xl border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-700 dark:bg-slate-800">
                    <button onClick={handleDownloadCsvFormat} className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-700">
                      <Download className="h-4 w-4 text-slate-400" /> Download CSV Format
                    </button>
                    <button onClick={() => { setOptionsOpen(false); fileInputRef.current?.click(); }} disabled={importing} className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:text-slate-200 dark:hover:bg-slate-700">
                      <Upload className="h-4 w-4 text-slate-400" /> {importing ? 'Importing…' : 'Import CSV'}
                    </button>
                    <button onClick={handleExportData} className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-700">
                      <FileOutput className="h-4 w-4 text-slate-400" /> Export Data
                    </button>
                  </div>
                </>
              )}
              <input ref={fileInputRef} type="file" accept=".csv,text/csv" onChange={handleBulkImport} className="hidden" />
            </div>
          )}
          <button onClick={load} disabled={loading} title="Reload leads from the server" className="flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800">
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Load Leads
          </button>
          <button onClick={() => setFilterOpen((f) => !f)} className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium ${filterOpen || filtersActive ? 'border-brand bg-brand-50 text-brand' : 'border-slate-300 text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800'}`}>
            <FilterIcon className="h-3.5 w-3.5" /> Filter{filtersActive ? ` (${[statusFilter, search, dateFrom, dateTo, consultantFilter, sourceFilter, branchFilter].filter(Boolean).length})` : ''}
          </button>
        </div>
      </div>

      {filterOpen && (
        <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white p-3 shadow-card dark:border-slate-700 dark:bg-slate-800">
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} title="Entry date from" className="rounded-lg border border-slate-300 px-2 py-1.5 text-xs focus:border-brand focus:outline-none dark:border-slate-600 dark:bg-slate-900" />
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} title="Entry date to" className="rounded-lg border border-slate-300 px-2 py-1.5 text-xs focus:border-brand focus:outline-none dark:border-slate-600 dark:bg-slate-900" />
          <input
            placeholder="Search by ID, name, email, mobile"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-56 rounded-lg border border-slate-300 px-2 py-1.5 text-xs focus:border-brand focus:outline-none dark:border-slate-600 dark:bg-slate-900"
          />
          <select value={consultantFilter} onChange={(e) => setConsultantFilter(e.target.value)} className="rounded-lg border border-slate-300 px-2 py-1.5 text-xs focus:border-brand focus:outline-none dark:border-slate-600 dark:bg-slate-900">
            <option value="">All Users</option>
            {consultants.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)} className="rounded-lg border border-slate-300 px-2 py-1.5 text-xs focus:border-brand focus:outline-none dark:border-slate-600 dark:bg-slate-900">
            <option value="">All Source</option>
            {SOURCE_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={branchFilter} onChange={(e) => setBranchFilter(e.target.value)} className="rounded-lg border border-slate-300 px-2 py-1.5 text-xs focus:border-brand focus:outline-none dark:border-slate-600 dark:bg-slate-900">
            <option value="">All Branches</option>
            {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
          <button className="rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90">Search</button>
          <button onClick={clearFilters} className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700">
            All
          </button>
        </div>
      )}

      {canCreate && (
        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
          CSV columns: source,clientName,phone,email,destination,branch — source must be one of {SOURCE_OPTIONS.join(', ')}; branch must match an existing branch name.
        </p>
      )}
      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
        SLA: whether this lead was contacted within the required response-time window. &quot;Breached&quot; means it wasn&apos;t — follow up as soon as possible.
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

      {/* Status stat cards — click to filter the table below */}
      <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
        <button
          onClick={() => setStatusFilter(null)}
          className={`flex items-center gap-2.5 rounded-xl border p-3 text-left shadow-card transition-all hover:-translate-y-0.5 ${statusFilter === null ? 'border-brand ring-2 ring-brand-100' : 'border-slate-100 dark:border-slate-700'} bg-white dark:bg-slate-800`}
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-slate-600 to-slate-700 text-white">
            <Layers className="h-[18px] w-[18px]" />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total</p>
            <p className="text-base font-extrabold text-slate-900 dark:text-slate-100">{leads.length}</p>
          </div>
        </button>
        {Object.values(LeadStatus).map((status) => {
          const meta = STATUS_META[status];
          return (
            <button
              key={status}
              onClick={() => setStatusFilter((s) => (s === status ? null : status))}
              className={`flex items-center gap-2.5 rounded-xl border p-3 text-left shadow-card transition-all hover:-translate-y-0.5 ${statusFilter === status ? 'border-brand ring-2 ring-brand-100' : 'border-slate-100 dark:border-slate-700'} bg-white dark:bg-slate-800`}
            >
              <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${meta.tile} text-white`}>
                <meta.icon className="h-[18px] w-[18px]" />
              </span>
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold leading-tight text-slate-500 dark:text-slate-400">{meta.label}</p>
                <p className="text-base font-extrabold text-slate-900 dark:text-slate-100">{statusCounts.get(status) ?? 0}</p>
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-4 overflow-hidden rounded-xl bg-white shadow-card dark:bg-slate-800">
        <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-brand-50/60 text-left text-xs font-semibold uppercase tracking-wide text-brand-700 dark:bg-slate-900/40 dark:text-brand-300">
            <tr>
              <th className="px-4 py-3">ID</th>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Destination</th>
              <th className="px-4 py-3">Tour Date</th>
              <th className="px-4 py-3">Package</th>
              <th className="px-4 py-3" title="Whether this lead was contacted within the required response-time window">SLA</th>
              <th className="px-4 py-3">Assign</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3" title="How likely/urgent this lead is to convert">Priority</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
            {filteredLeads.map((l) => (
              <tr key={l.id} className="transition-colors hover:bg-slate-50 dark:hover:bg-slate-700/50">
                <td className="px-4 py-3">
                  <Link href={`/leads/${l.id}`} className="font-mono text-xs font-semibold text-brand hover:underline">#{shortId(l.id)}</Link>
                </td>
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
                <td className="px-4 py-3 whitespace-nowrap text-slate-600 dark:text-slate-300">
                  {l.travelDate ? new Date(l.travelDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                </td>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                  {l.packageLabel ?? <span className="text-slate-400">No Package</span>}
                </td>
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
                  {canAssign ? (
                    <select
                      value={l.assignedConsultantId ?? ''}
                      onChange={(e) => handleAssignChange(l.id, e.target.value)}
                      className="w-[150px] rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs focus:border-brand focus:outline-none dark:border-slate-600 dark:bg-slate-900"
                    >
                      <option value="" disabled={!!l.assignedConsultantId}>
                        {l.assignedConsultantId ? 'Unassigned' : '— Auto-assign —'}
                      </option>
                      {consultants
                        .filter((c) => c.branchId === l.branchId || c.id === l.assignedConsultantId)
                        .map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  ) : (
                    <span className="text-slate-600 dark:text-slate-300">{l.assignedConsultantName ?? '—'}</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <BadgeDropdown
                    value={l.status}
                    options={STATUS_DROPDOWN_OPTIONS}
                    onChange={(v) => handleStatusChange(l.id, v)}
                    triggerClassName="w-[170px]"
                  />
                  {editingNoteFor === l.id ? (
                    <div className="mt-1 flex items-center gap-1">
                      <input
                        autoFocus
                        value={noteDraft}
                        onChange={(e) => setNoteDraft(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') saveNote(l.id); if (e.key === 'Escape') setEditingNoteFor(null); }}
                        placeholder="Reason…"
                        className="w-[150px] rounded-md border border-slate-300 px-1.5 py-1 text-[11px] focus:border-brand focus:outline-none dark:border-slate-600 dark:bg-slate-900"
                      />
                      <button onClick={() => saveNote(l.id)} className="text-[11px] font-semibold text-brand">Save</button>
                      <button onClick={() => setEditingNoteFor(null)} className="text-slate-400"><X className="h-3 w-3" /></button>
                    </div>
                  ) : (
                    <button
                      onClick={() => startEditNote(l)}
                      className="mt-1 flex max-w-[170px] items-center gap-1 rounded-md bg-amber-100 px-1.5 py-0.5 text-left text-[11px] font-medium text-amber-800 hover:bg-amber-200 dark:bg-amber-900/40 dark:text-amber-300"
                    >
                      <Pencil className="h-2.5 w-2.5 shrink-0" />
                      <span className="truncate">{l.statusNote || 'Add reason…'}</span>
                    </button>
                  )}
                </td>
                <td className="px-4 py-3">
                  <BadgeDropdown
                    value={l.temperature}
                    options={TEMPERATURE_DROPDOWN_OPTIONS}
                    onChange={(v) => handleTemperatureChange(l.id, v)}
                    triggerClassName="w-[90px]"
                  />
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <Link href={`/leads/${l.id}`} title="View" className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-brand dark:hover:bg-slate-700">
                      <Eye className="h-4 w-4" />
                    </Link>
                    {l.email && (
                      <a href={`mailto:${l.email}`} title="Email" className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-brand dark:hover:bg-slate-700">
                        <Mail className="h-4 w-4" />
                      </a>
                    )}
                    <a href={`https://wa.me/${l.phone.replace(/[^0-9]/g, '')}`} target="_blank" rel="noreferrer" title="WhatsApp" className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-emerald-600 dark:hover:bg-slate-700">
                      <MessageCircle className="h-4 w-4" />
                    </a>
                    <Link href={`/leads/${l.id}`} title="Edit" className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-brand dark:hover:bg-slate-700">
                      <Pencil className="h-4 w-4" />
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
            {filteredLeads.length === 0 && (
              <tr><td colSpan={10} className="px-4 py-6 text-center text-slate-400">{leads.length === 0 ? 'No leads yet.' : 'No leads match your filters.'}</td></tr>
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
