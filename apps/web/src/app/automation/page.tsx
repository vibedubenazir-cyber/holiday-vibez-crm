'use client';

import { FormEvent, useEffect, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { api, ApiError } from '@/lib/api';
import { AutomationTrigger, LeadStatus, NotificationChannel, type AutomationLogDTO, type AutomationRuleDTO, type TemplateDTO } from '@holiday-vibez/shared';

const TRIGGER_LABELS: Record<string, string> = {
  LEAD_CREATED: 'Lead created',
  LEAD_STATUS_CHANGED: 'Lead status changed to...',
  QUOTATION_SENT: 'Quotation sent',
  BOOKING_CONFIRMED: 'Booking confirmed',
};

export default function AutomationPage() {
  const [rules, setRules] = useState<AutomationRuleDTO[]>([]);
  const [logs, setLogs] = useState<AutomationLogDTO[]>([]);
  const [templates, setTemplates] = useState<TemplateDTO[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const [form, setForm] = useState({
    name: '',
    trigger: AutomationTrigger.LEAD_CREATED as string,
    targetLeadStatus: LeadStatus.FOLLOW_UP as string,
    delayMinutes: '60',
    channel: NotificationChannel.WHATSAPP as string,
    templateId: '',
  });

  async function load() {
    try {
      const [r, l, t] = await Promise.all([
        api.get<AutomationRuleDTO[]>('/automation/rules'),
        api.get<AutomationLogDTO[]>('/automation/logs'),
        api.get<TemplateDTO[]>('/templates'),
      ]);
      setRules(r);
      setLogs(l);
      setTemplates(t);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load automation data');
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api.post('/automation/rules', {
        name: form.name,
        trigger: form.trigger,
        targetLeadStatus: form.trigger === AutomationTrigger.LEAD_STATUS_CHANGED ? form.targetLeadStatus : undefined,
        delayMinutes: Number(form.delayMinutes),
        channel: form.channel,
        templateId: form.templateId || undefined,
      });
      setForm({ ...form, name: '', delayMinutes: '60', templateId: '' });
      setShowForm(false);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to create rule');
    }
  }

  async function handleToggle(rule: AutomationRuleDTO) {
    try {
      await api.patch(`/automation/rules/${rule.id}`, { active: !rule.active });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to update rule');
    }
  }

  return (
    <AppShell>
      <div className="flex items-center justify-between">
        <h1 className="inline-block rounded-lg bg-brand px-4 py-2 text-xl font-bold tracking-tight text-white shadow-card">Automation</h1>
        <button onClick={() => setShowForm((s) => !s)} className="rounded-lg bg-gradient-to-r from-brand to-brand-500 px-3 py-1.5 text-sm font-medium text-white shadow-card transition-all hover:shadow-card-hover hover:brightness-105">
          {showForm ? 'Cancel' : 'New rule'}
        </button>
      </div>
      <p className="mt-1 text-sm text-slate-500">
        A sweep runs every 5 minutes, checking every active rule against Leads and firing through the same notification pipeline as the rest of the CRM.
      </p>
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      {showForm && (
        <form onSubmit={handleCreate} className="mt-4 grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-white shadow-card transition-shadow hover:shadow-card-hover p-4 sm:grid-cols-2 lg:grid-cols-3">
          <input required placeholder="Rule name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-100 transition-colors" />
          <select value={form.trigger} onChange={(e) => setForm({ ...form, trigger: e.target.value })} className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-100 transition-colors">
            {Object.entries(TRIGGER_LABELS).map(([v, label]) => <option key={v} value={v}>{label}</option>)}
          </select>
          {form.trigger === AutomationTrigger.LEAD_STATUS_CHANGED && (
            <select value={form.targetLeadStatus} onChange={(e) => setForm({ ...form, targetLeadStatus: e.target.value })} className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-100 transition-colors">
              {Object.values(LeadStatus).map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          )}
          <input required type="number" min={0} placeholder="Delay (minutes)" value={form.delayMinutes} onChange={(e) => setForm({ ...form, delayMinutes: e.target.value })} className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-100 transition-colors" />
          <select value={form.channel} onChange={(e) => setForm({ ...form, channel: e.target.value })} className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-100 transition-colors">
            <option value={NotificationChannel.WHATSAPP}>WhatsApp</option>
            <option value={NotificationChannel.EMAIL}>Email</option>
          </select>
          <select value={form.templateId} onChange={(e) => setForm({ ...form, templateId: e.target.value })} className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-100 transition-colors">
            <option value="">No template</option>
            {templates.filter((t) => t.channel === form.channel).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          <button type="submit" className="rounded-lg bg-brand px-3 py-2 text-sm font-medium text-white hover:bg-brand-dark sm:col-span-2 lg:col-span-3">
            Create rule
          </button>
        </form>
      )}

      <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-card transition-shadow hover:shadow-card-hover">
        <div className="border-b border-slate-100 px-4 py-2 text-xs font-medium uppercase tracking-wide text-slate-500">Rules</div>
        <table className="w-full text-sm">
          <thead className="bg-brand-50/60 text-left text-xs font-semibold uppercase tracking-wide text-brand-700">
            <tr>
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Trigger</th>
              <th className="px-4 py-2">Delay</th>
              <th className="px-4 py-2">Channel</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rules.map((r) => (
              <tr key={r.id} className="border-t border-slate-100">
                <td className="px-4 py-2 font-medium text-slate-800">{r.name}</td>
                <td className="px-4 py-2">{TRIGGER_LABELS[r.trigger]}{r.targetLeadStatus ? ` (${r.targetLeadStatus})` : ''}</td>
                <td className="px-4 py-2">{r.delayMinutes}m</td>
                <td className="px-4 py-2">{r.channel}</td>
                <td className="px-4 py-2">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${r.active ? 'bg-blue-100 text-blue-700' : 'bg-slate-200 text-slate-600'}`}>
                    {r.active ? 'Active' : 'Paused'}
                  </span>
                </td>
                <td className="px-4 py-2 text-right">
                  <button onClick={() => handleToggle(r)} className="text-brand hover:underline">{r.active ? 'Pause' : 'Activate'}</button>
                </td>
              </tr>
            ))}
            {rules.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-6 text-center text-slate-400">No automation rules yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-card transition-shadow hover:shadow-card-hover">
        <div className="border-b border-slate-100 px-4 py-2 text-xs font-medium uppercase tracking-wide text-slate-500">Recent fires</div>
        <table className="w-full text-sm">
          <thead className="bg-brand-50/60 text-left text-xs font-semibold uppercase tracking-wide text-brand-700">
            <tr>
              <th className="px-4 py-2">Rule</th>
              <th className="px-4 py-2">Lead</th>
              <th className="px-4 py-2">Fired at</th>
              <th className="px-4 py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((l) => (
              <tr key={l.id} className="border-t border-slate-100">
                <td className="px-4 py-2">{l.rule?.name}</td>
                <td className="px-4 py-2">{l.lead?.clientName}</td>
                <td className="px-4 py-2">{new Date(l.firedAt).toLocaleString()}</td>
                <td className="px-4 py-2">{l.status}</td>
              </tr>
            ))}
            {logs.length === 0 && (
              <tr><td colSpan={4} className="px-4 py-6 text-center text-slate-400">No automation fires yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}
