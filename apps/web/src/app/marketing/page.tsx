'use client';

import { FormEvent, useEffect, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { api, ApiError } from '@/lib/api';
import { NotificationChannel, type BranchDTO, type CampaignDTO, type MarketingDashboardDTO, type TemplateDTO } from '@holiday-vibez/shared';

type Tab = 'campaigns' | 'occasions' | 'reengage';

type Occasion = {
  id: string;
  name: string;
  month: number;
  day: number;
  messageBody: string;
  active: boolean;
  audienceBranchId: string | null;
};

type ReengageRow = {
  leadId: string;
  clientName: string;
  phone: string;
  pastDestination: string;
  lastDepartureDate: string;
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const REENGAGE_DEFAULT_MSG =
  'Hi {{name}}! 🌏 We loved planning your trip to {{pastDestination}}. Feeling the travel itch again? {{newDestination}} is calling — reply and we’ll craft something special just for you. ✈️';

export default function MarketingPage() {
  const [tab, setTab] = useState<Tab>('campaigns');
  const [dashboard, setDashboard] = useState<MarketingDashboardDTO | null>(null);
  const [campaigns, setCampaigns] = useState<CampaignDTO[]>([]);
  const [templates, setTemplates] = useState<TemplateDTO[]>([]);
  const [branches, setBranches] = useState<BranchDTO[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const [form, setForm] = useState({ name: '', channel: NotificationChannel.WHATSAPP as string, templateId: '', audienceBranchId: '' });

  // Occasions
  const [occasions, setOccasions] = useState<Occasion[]>([]);
  const emptyOcc = { id: '', name: '', month: 1, day: 1, messageBody: '', active: true };
  const [occForm, setOccForm] = useState(emptyOcc);
  const [showOccForm, setShowOccForm] = useState(false);

  // Re-engagement
  const [reFilters, setReFilters] = useState({ monthsAgoMin: 3, monthsAgoMax: 5, pastDestination: '' });
  const [reRows, setReRows] = useState<ReengageRow[] | null>(null);
  const [reSelected, setReSelected] = useState<Set<string>>(new Set());
  const [reMessage, setReMessage] = useState(REENGAGE_DEFAULT_MSG);
  const [reNewDest, setReNewDest] = useState('');
  const [reBusy, setReBusy] = useState(false);
  const [reResult, setReResult] = useState<string | null>(null);

  async function load() {
    try {
      const [d, c, t, b] = await Promise.all([
        api.get<MarketingDashboardDTO>('/marketing/dashboard'),
        api.get<CampaignDTO[]>('/campaigns'),
        api.get<TemplateDTO[]>('/templates'),
        api.get<BranchDTO[]>('/branches'),
      ]);
      setDashboard(d);
      setCampaigns(c);
      setTemplates(t);
      setBranches(b);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load marketing data');
    }
  }

  async function loadOccasions() {
    try {
      setOccasions(await api.get<Occasion[]>('/marketing/occasions'));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load occasions');
    }
  }

  useEffect(() => {
    load();
    loadOccasions();
  }, []);

  function branchName(id: string | null) {
    return branches.find((b) => b.id === id)?.name ?? 'All branches';
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api.post('/campaigns', {
        name: form.name,
        channel: form.channel,
        templateId: form.templateId || undefined,
        audienceBranchId: form.audienceBranchId || undefined,
      });
      setForm({ name: '', channel: NotificationChannel.WHATSAPP, templateId: '', audienceBranchId: '' });
      setShowForm(false);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to create campaign');
    }
  }

  async function handleSend(id: string) {
    setError(null);
    try {
      await api.post(`/campaigns/${id}/send`);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to send campaign');
    }
  }

  // ---- Occasions ----
  function editOcc(o: Occasion) {
    setOccForm({ id: o.id, name: o.name, month: o.month, day: o.day, messageBody: o.messageBody, active: o.active });
    setShowOccForm(true);
  }

  async function saveOcc(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const payload = { name: occForm.name, month: occForm.month, day: occForm.day, messageBody: occForm.messageBody, active: occForm.active };
    try {
      if (occForm.id) await api.patch(`/marketing/occasions/${occForm.id}`, payload);
      else await api.post('/marketing/occasions', payload);
      setOccForm(emptyOcc);
      setShowOccForm(false);
      await loadOccasions();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to save occasion');
    }
  }

  async function toggleOcc(o: Occasion) {
    setError(null);
    try {
      await api.patch(`/marketing/occasions/${o.id}`, { name: o.name, month: o.month, day: o.day, messageBody: o.messageBody, active: !o.active });
      await loadOccasions();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to update occasion');
    }
  }

  async function deleteOcc(id: string) {
    setError(null);
    try {
      await api.delete(`/marketing/occasions/${id}`);
      await loadOccasions();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to delete occasion');
    }
  }

  // ---- Re-engagement ----
  async function previewReengage() {
    setError(null);
    setReResult(null);
    try {
      const rows = await api.post<ReengageRow[]>('/marketing/reengagement/preview', {
        monthsAgoMin: reFilters.monthsAgoMin,
        monthsAgoMax: reFilters.monthsAgoMax,
        pastDestination: reFilters.pastDestination || undefined,
      });
      setReRows(rows);
      setReSelected(new Set(rows.map((r) => r.leadId))); // all selected by default
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to build segment');
    }
  }

  function toggleSelected(leadId: string) {
    setReSelected((prev) => {
      const next = new Set(prev);
      next.has(leadId) ? next.delete(leadId) : next.add(leadId);
      return next;
    });
  }

  async function sendReengage() {
    setError(null);
    setReResult(null);
    const leadIds = Array.from(reSelected);
    if (leadIds.length === 0) {
      setError('Select at least one client to message.');
      return;
    }
    setReBusy(true);
    try {
      const res = await api.post<{ sent: number; skipped: number }>('/marketing/reengagement/send', {
        leadIds,
        messageBody: reMessage,
        newDestination: reNewDest || undefined,
      });
      setReResult(`Sent to ${res.sent} client${res.sent === 1 ? '' : 's'}${res.skipped ? `, ${res.skipped} skipped (already messaged this month)` : ''}.`);
      setReRows(null);
      setReSelected(new Set());
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to send messages');
    } finally {
      setReBusy(false);
    }
  }

  const tabBtn = (t: Tab, label: string) => (
    <button
      onClick={() => setTab(t)}
      className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
        tab === t ? 'bg-gradient-to-br from-brand-600 to-brand-500 text-white shadow-md shadow-brand-500/25' : 'text-brand-700/80 hover:bg-brand-50'
      }`}
    >
      {label}
    </button>
  );

  return (
    <AppShell>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold tracking-tight text-brand-700">Marketing</h1>
        {tab === 'campaigns' && (
          <button onClick={() => setShowForm((s) => !s)} className="rounded-xl bg-gradient-to-br from-brand-600 to-brand-500 px-3 py-1.5 text-sm font-semibold text-white shadow-md shadow-brand-500/25 transition hover:opacity-90">
            {showForm ? 'Cancel' : 'New campaign'}
          </button>
        )}
        {tab === 'occasions' && (
          <button onClick={() => { setOccForm(emptyOcc); setShowOccForm((s) => !s); }} className="rounded-xl bg-gradient-to-br from-brand-600 to-brand-500 px-3 py-1.5 text-sm font-semibold text-white shadow-md shadow-brand-500/25 transition hover:opacity-90">
            {showOccForm ? 'Cancel' : 'Add occasion'}
          </button>
        )}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {tabBtn('campaigns', 'Campaigns')}
        {tabBtn('occasions', 'Festive occasions')}
        {tabBtn('reengage', 'Re-engagement')}
      </div>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      {/* ===== CAMPAIGNS ===== */}
      {tab === 'campaigns' && (
        <>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="border-l-4 border-l-brand bg-white dark:bg-slate-800 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-brand">Campaigns sent this month</p>
              <p className="mt-1 text-2xl font-semibold text-slate-800">{dashboard?.campaignsSentThisMonth ?? 0}</p>
            </div>
            <div className="border-l-4 border-l-blue-500 bg-white dark:bg-slate-800 p-4 sm:col-span-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">Leads by source</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {dashboard?.leadsBySource.map((s) => (
                  <span key={s.source} className="rounded-lg bg-blue-50 px-2 py-1 text-xs text-blue-700">{s.source}: {s.count}</span>
                ))}
                {(!dashboard || dashboard.leadsBySource.length === 0) && <span className="text-sm text-slate-400">No leads yet.</span>}
              </div>
            </div>
            <div className="border-l-4 border-l-brand-500 bg-white dark:bg-slate-800 p-4 sm:col-span-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">Upcoming birthdays &amp; anniversaries (next 7 days)</p>
              <p className="mt-1 text-[11px] text-slate-400">A warm, personalised WhatsApp wish sends automatically on the day.</p>
              <div className="mt-2 space-y-1">
                {dashboard?.upcoming.map((u) => (
                  <p key={u.travelerId} className="text-sm text-slate-600">{u.name} ({u.leadClientName}) — {u.type === 'BIRTHDAY' ? 'Birthday' : 'Anniversary'}</p>
                ))}
                {(!dashboard || dashboard.upcoming.length === 0) && <p className="text-sm text-slate-400">None in the next 7 days.</p>}
              </div>
            </div>
          </div>

          {showForm && (
            <form onSubmit={handleCreate} className="mt-4 grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-white dark:bg-slate-800 shadow-card p-4 sm:grid-cols-2 lg:grid-cols-4">
              <input required placeholder="Campaign name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none" />
              <select value={form.channel} onChange={(e) => setForm({ ...form, channel: e.target.value })} className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none">
                <option value={NotificationChannel.WHATSAPP}>WhatsApp</option>
                <option value={NotificationChannel.EMAIL}>Email</option>
              </select>
              <select value={form.templateId} onChange={(e) => setForm({ ...form, templateId: e.target.value })} className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none">
                <option value="">No template</option>
                {templates.filter((t) => t.channel === form.channel).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
              <select value={form.audienceBranchId} onChange={(e) => setForm({ ...form, audienceBranchId: e.target.value })} className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none">
                <option value="">All branches</option>
                {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
              <button type="submit" className="rounded-xl bg-gradient-to-br from-brand-600 to-brand-500 shadow-md shadow-brand-500/25 px-3 py-2 text-sm font-medium text-white hover:opacity-90 sm:col-span-2 lg:col-span-4">Create campaign</button>
            </form>
          )}

          <div className="mt-4 overflow-x-auto bg-white dark:bg-slate-800">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="bg-brand-50/60 text-left text-xs font-semibold uppercase tracking-wide text-brand-700 dark:bg-slate-900/40 dark:text-brand-300">
                <tr>
                  <th className="px-4 py-2">Name</th><th className="px-4 py-2">Channel</th><th className="px-4 py-2">Audience</th><th className="px-4 py-2">Status</th><th className="px-4 py-2">Sent</th><th className="px-4 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map((c) => (
                  <tr key={c.id} className="border-t border-slate-100">
                    <td className="px-4 py-2 font-medium text-slate-800">{c.name}</td>
                    <td className="px-4 py-2">{c.channel}</td>
                    <td className="px-4 py-2">{branchName(c.audienceBranchId)}</td>
                    <td className="px-4 py-2"><span className={`rounded-lg px-2 py-0.5 text-xs font-medium ${c.status === 'SENT' ? 'bg-blue-100 text-blue-700' : 'bg-slate-200 text-slate-600'}`}>{c.status}</span></td>
                    <td className="px-4 py-2">{c.sentCount}</td>
                    <td className="px-4 py-2 text-right">{c.status !== 'SENT' && <button onClick={() => handleSend(c.id)} className="text-brand hover:underline">Send</button>}</td>
                  </tr>
                ))}
                {campaigns.length === 0 && <tr><td colSpan={6} className="px-4 py-6 text-center text-slate-400">No campaigns yet.</td></tr>}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ===== FESTIVE OCCASIONS ===== */}
      {tab === 'occasions' && (
        <>
          <p className="mt-4 text-sm text-slate-500">Festive greetings send automatically on the day, over WhatsApp, to every client who has booked with you. Use <code className="rounded bg-slate-100 px-1 dark:bg-slate-700">{'{{name}}'}</code> for the client’s name. Movable festivals (Diwali, Holi, Eid) shift each year — update their date annually.</p>

          {showOccForm && (
            <form onSubmit={saveOcc} className="mt-4 grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-white dark:bg-slate-800 shadow-card p-4 sm:grid-cols-2">
              <input required placeholder="Occasion name (e.g. Diwali)" value={occForm.name} onChange={(e) => setOccForm({ ...occForm, name: e.target.value })} className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none" />
              <div className="flex gap-2">
                <select value={occForm.month} onChange={(e) => setOccForm({ ...occForm, month: Number(e.target.value) })} className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none">
                  {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                </select>
                <select value={occForm.day} onChange={(e) => setOccForm({ ...occForm, day: Number(e.target.value) })} className="w-24 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none">
                  {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <textarea required rows={3} placeholder="Message — supports {{name}}" value={occForm.messageBody} onChange={(e) => setOccForm({ ...occForm, messageBody: e.target.value })} className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none sm:col-span-2" />
              <label className="flex items-center gap-2 text-sm text-slate-600">
                <input type="checkbox" checked={occForm.active} onChange={(e) => setOccForm({ ...occForm, active: e.target.checked })} /> Active
              </label>
              <button type="submit" className="rounded-xl bg-gradient-to-br from-brand-600 to-brand-500 shadow-md shadow-brand-500/25 px-3 py-2 text-sm font-medium text-white hover:opacity-90 sm:col-span-2">{occForm.id ? 'Save changes' : 'Add occasion'}</button>
            </form>
          )}

          <div className="mt-4 space-y-2">
            {occasions.map((o) => (
              <div key={o.id} className="rounded-xl border border-slate-200 bg-white p-3 shadow-card dark:bg-slate-800">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-800 dark:text-slate-100">{o.name}</span>
                    <span className="rounded-lg bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700">{o.day} {MONTHS[o.month - 1]}</span>
                    <span className={`rounded-lg px-2 py-0.5 text-xs font-medium ${o.active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-500'}`}>{o.active ? 'Active' : 'Paused'}</span>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <button onClick={() => editOcc(o)} className="rounded-lg px-2 py-1 text-xs font-medium text-brand hover:bg-brand-50">Edit</button>
                    <button onClick={() => toggleOcc(o)} className="rounded-lg px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700">{o.active ? 'Pause' : 'Activate'}</button>
                    <button onClick={() => deleteOcc(o.id)} className="rounded-lg px-2 py-1 text-xs font-medium text-rose-600 hover:bg-rose-50">Delete</button>
                  </div>
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600 dark:text-slate-300">{o.messageBody}</p>
              </div>
            ))}
            {occasions.length === 0 && <p className="rounded-xl bg-white px-4 py-6 text-center text-slate-400 shadow-card dark:bg-slate-800">No occasions yet — add one to start sending festive wishes.</p>}
          </div>
        </>
      )}

      {/* ===== RE-ENGAGEMENT ===== */}
      {tab === 'reengage' && (
        <>
          <p className="mt-4 text-sm text-slate-500">Find clients whose last trip departed a while ago and nudge them toward a new destination. Nothing sends until you review the list and click send. Each client is messaged at most once a month.</p>

          <div className="mt-4 grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-white dark:bg-slate-800 shadow-card p-4 sm:grid-cols-4">
            <label className="text-xs font-medium text-slate-500">Travelled between (months ago)
              <div className="mt-1 flex items-center gap-2">
                <input type="number" min={0} max={120} value={reFilters.monthsAgoMin} onChange={(e) => setReFilters({ ...reFilters, monthsAgoMin: Number(e.target.value) })} className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm focus:border-brand focus:outline-none" />
                <span className="text-slate-400">–</span>
                <input type="number" min={1} max={120} value={reFilters.monthsAgoMax} onChange={(e) => setReFilters({ ...reFilters, monthsAgoMax: Number(e.target.value) })} className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm focus:border-brand focus:outline-none" />
              </div>
            </label>
            <label className="text-xs font-medium text-slate-500 sm:col-span-2">Went to (optional)
              <input placeholder="e.g. Andaman" value={reFilters.pastDestination} onChange={(e) => setReFilters({ ...reFilters, pastDestination: e.target.value })} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:border-brand focus:outline-none" />
            </label>
            <button onClick={previewReengage} className="self-end rounded-xl bg-gradient-to-br from-brand-600 to-brand-500 shadow-md shadow-brand-500/25 px-3 py-2 text-sm font-medium text-white hover:opacity-90">Preview segment</button>
          </div>

          {reResult && <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700">✓ {reResult}</p>}

          {reRows !== null && (
            <>
              <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200 bg-white dark:bg-slate-800">
                <table className="w-full min-w-[560px] text-sm">
                  <thead className="bg-brand-50/60 text-left text-xs font-semibold uppercase tracking-wide text-brand-700 dark:bg-slate-900/40 dark:text-brand-300">
                    <tr>
                      <th className="w-10 px-4 py-2">
                        <input type="checkbox" checked={reRows.length > 0 && reSelected.size === reRows.length} onChange={(e) => setReSelected(e.target.checked ? new Set(reRows.map((r) => r.leadId)) : new Set())} />
                      </th>
                      <th className="px-4 py-2">Client</th><th className="px-4 py-2">Went to</th><th className="px-4 py-2">Last trip</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reRows.map((r) => (
                      <tr key={r.leadId} className="border-t border-slate-100">
                        <td className="px-4 py-2"><input type="checkbox" checked={reSelected.has(r.leadId)} onChange={() => toggleSelected(r.leadId)} /></td>
                        <td className="px-4 py-2"><p className="font-medium text-slate-800 dark:text-slate-100">{r.clientName}</p><p className="text-xs text-slate-400">{r.phone}</p></td>
                        <td className="px-4 py-2 text-slate-600 dark:text-slate-300">{r.pastDestination}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-slate-600 dark:text-slate-300">{new Date(r.lastDepartureDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                      </tr>
                    ))}
                    {reRows.length === 0 && <tr><td colSpan={4} className="px-4 py-6 text-center text-slate-400">No clients match — try widening the window.</td></tr>}
                  </tbody>
                </table>
              </div>

              {reRows.length > 0 && (
                <div className="mt-4 grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-white dark:bg-slate-800 shadow-card p-4 sm:grid-cols-2">
                  <label className="text-xs font-medium text-slate-500">New destination to pitch (optional)
                    <input placeholder="e.g. Andaman" value={reNewDest} onChange={(e) => setReNewDest(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:border-brand focus:outline-none" />
                  </label>
                  <div className="text-xs font-medium text-slate-500 sm:row-span-2">Tokens
                    <p className="mt-1 text-[11px] font-normal text-slate-400">
                      <code className="rounded bg-slate-100 px-1 dark:bg-slate-700">{'{{name}}'}</code>, <code className="rounded bg-slate-100 px-1 dark:bg-slate-700">{'{{pastDestination}}'}</code>, <code className="rounded bg-slate-100 px-1 dark:bg-slate-700">{'{{newDestination}}'}</code>
                    </p>
                  </div>
                  <label className="text-xs font-medium text-slate-500 sm:col-span-1">WhatsApp message
                    <textarea rows={4} value={reMessage} onChange={(e) => setReMessage(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none" />
                  </label>
                  <button disabled={reBusy} onClick={sendReengage} className="self-end rounded-xl bg-gradient-to-br from-brand-600 to-brand-500 shadow-md shadow-brand-500/25 px-3 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60 sm:col-span-2">
                    {reBusy ? 'Sending…' : `Send WhatsApp to ${reSelected.size} selected`}
                  </button>
                </div>
              )}
            </>
          )}
        </>
      )}
    </AppShell>
  );
}
