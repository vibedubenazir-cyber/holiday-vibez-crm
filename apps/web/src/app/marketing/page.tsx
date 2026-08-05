'use client';

import { FormEvent, useEffect, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { api, ApiError } from '@/lib/api';
import { NotificationChannel, type BranchDTO, type CampaignDTO, type MarketingDashboardDTO, type TemplateDTO } from '@holiday-vibez/shared';

export default function MarketingPage() {
  const [dashboard, setDashboard] = useState<MarketingDashboardDTO | null>(null);
  const [campaigns, setCampaigns] = useState<CampaignDTO[]>([]);
  const [templates, setTemplates] = useState<TemplateDTO[]>([]);
  const [branches, setBranches] = useState<BranchDTO[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const [form, setForm] = useState({ name: '', channel: NotificationChannel.WHATSAPP as string, templateId: '', audienceBranchId: '' });

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

  useEffect(() => {
    load();
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

  return (
    <AppShell>
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">Marketing</h1>
        <button onClick={() => setShowForm((s) => !s)} className="rounded-lg bg-gradient-to-r from-brand to-brand-500 px-3 py-1.5 text-sm font-medium text-white shadow-card transition-all hover:shadow-card-hover hover:brightness-105">
          {showForm ? 'Cancel' : 'New campaign'}
        </button>
      </div>
      {error && <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>}

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-card transition-shadow hover:shadow-card-hover p-4">
          <p className="text-xs uppercase tracking-wide text-slate-400 dark:text-slate-500">Campaigns sent this month</p>
          <p className="mt-1 text-2xl font-semibold text-slate-800 dark:text-slate-100">{dashboard?.campaignsSentThisMonth ?? 0}</p>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-card transition-shadow hover:shadow-card-hover p-4 sm:col-span-2">
          <p className="text-xs uppercase tracking-wide text-slate-400 dark:text-slate-500">Leads by source</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {dashboard?.leadsBySource.map((s) => (
              <span key={s.source} className="rounded-full bg-slate-100 dark:bg-slate-700 px-2 py-1 text-xs text-slate-600 dark:text-slate-300">
                {s.source}: {s.count}
              </span>
            ))}
            {(!dashboard || dashboard.leadsBySource.length === 0) && <span className="text-sm text-slate-400 dark:text-slate-500">No leads yet.</span>}
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-card transition-shadow hover:shadow-card-hover p-4 sm:col-span-3">
          <p className="text-xs uppercase tracking-wide text-slate-400 dark:text-slate-500">Upcoming birthdays &amp; anniversaries (next 7 days)</p>
          <div className="mt-2 space-y-1">
            {dashboard?.upcoming.map((u) => (
              <p key={u.travelerId} className="text-sm text-slate-600 dark:text-slate-300">
                {u.name} ({u.leadClientName}) — {u.type === 'BIRTHDAY' ? 'Birthday' : 'Anniversary'}
              </p>
            ))}
            {(!dashboard || dashboard.upcoming.length === 0) && <p className="text-sm text-slate-400 dark:text-slate-500">None in the next 7 days.</p>}
          </div>
        </div>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="mt-4 grid grid-cols-1 gap-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-card transition-shadow hover:shadow-card-hover p-4 sm:grid-cols-2 lg:grid-cols-4">
          <input required placeholder="Campaign name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm" />
          <select value={form.channel} onChange={(e) => setForm({ ...form, channel: e.target.value })} className="rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm">
            <option value={NotificationChannel.WHATSAPP}>WhatsApp</option>
            <option value={NotificationChannel.EMAIL}>Email</option>
          </select>
          <select value={form.templateId} onChange={(e) => setForm({ ...form, templateId: e.target.value })} className="rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm">
            <option value="">No template</option>
            {templates.filter((t) => t.channel === form.channel).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          <select value={form.audienceBranchId} onChange={(e) => setForm({ ...form, audienceBranchId: e.target.value })} className="rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm">
            <option value="">All branches</option>
            {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
          <button type="submit" className="rounded-lg bg-brand px-3 py-2 text-sm font-medium text-white hover:bg-brand-dark sm:col-span-2 lg:col-span-4">
            Create campaign
          </button>
        </form>
      )}

      <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-card transition-shadow hover:shadow-card-hover">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 dark:bg-slate-900 text-left text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
            <tr>
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Channel</th>
              <th className="px-4 py-2">Audience</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">Sent</th>
              <th className="px-4 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {campaigns.map((c) => (
              <tr key={c.id} className="border-t border-slate-100 dark:border-slate-800">
                <td className="px-4 py-2 font-medium text-slate-800 dark:text-slate-100">{c.name}</td>
                <td className="px-4 py-2">{c.channel}</td>
                <td className="px-4 py-2">{branchName(c.audienceBranchId)}</td>
                <td className="px-4 py-2">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${c.status === 'SENT' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' : 'bg-slate-200 text-slate-600 dark:text-slate-300'}`}>
                    {c.status}
                  </span>
                </td>
                <td className="px-4 py-2">{c.sentCount}</td>
                <td className="px-4 py-2 text-right">
                  {c.status !== 'SENT' && (
                    <button onClick={() => handleSend(c.id)} className="text-brand hover:underline">Send</button>
                  )}
                </td>
              </tr>
            ))}
            {campaigns.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-6 text-center text-slate-400 dark:text-slate-500">No campaigns yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}
