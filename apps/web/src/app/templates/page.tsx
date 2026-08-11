'use client';

import { FormEvent, useEffect, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { useAuth } from '@/lib/auth-context';
import { api, ApiError } from '@/lib/api';
import { NotificationChannel, Role, type TemplateDTO } from '@holiday-vibez/shared';

export default function TemplatesPage() {
  const { user: me } = useAuth();
  const [templates, setTemplates] = useState<TemplateDTO[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const canManage = me?.role === Role.ADMIN || me?.role === Role.DIRECTOR;

  const [form, setForm] = useState({ channel: NotificationChannel.WHATSAPP as string, name: '', subject: '', body: '' });

  async function load() {
    try {
      setTemplates(await api.get<TemplateDTO[]>('/templates'));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load templates');
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api.post('/templates', { ...form, subject: form.subject || undefined });
      setForm({ channel: NotificationChannel.WHATSAPP, name: '', subject: '', body: '' });
      setShowForm(false);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to create template. Only Admin/Director can manage templates.');
    }
  }

  return (
    <AppShell>
      <div className="flex items-center justify-between">
        <h1 className="inline-block rounded-lg bg-brand-50 px-4 py-2 text-xl font-bold tracking-tight text-brand shadow-card">Templates</h1>
        {canManage && (
          <button onClick={() => setShowForm((s) => !s)} className="rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-brand-700">
            {showForm ? 'Cancel' : 'Add template'}
          </button>
        )}
      </div>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        Reusable WhatsApp/email message templates, selectable from the Inbox compose box.
      </p>
      {!canManage && <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Read-only — only Admin/Director can manage templates.</p>}

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      {canManage && showForm && (
        <form onSubmit={handleCreate} className="mt-4 grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-white dark:bg-slate-800 shadow-card transition-shadow hover:shadow-card-hover p-4 sm:grid-cols-2">
          <select value={form.channel} onChange={(e) => setForm({ ...form, channel: e.target.value })} className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-100 transition-colors">
            <option value={NotificationChannel.WHATSAPP}>WhatsApp</option>
            <option value={NotificationChannel.EMAIL}>Email</option>
          </select>
          <input required placeholder="Template name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-100 transition-colors" />
          {form.channel === NotificationChannel.EMAIL && (
            <input placeholder="Subject" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-100 transition-colors sm:col-span-2" />
          )}
          <textarea required placeholder="Message body" value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} rows={3} className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-100 transition-colors sm:col-span-2" />
          <button type="submit" className="rounded-lg bg-brand px-3 py-2 text-sm font-medium text-white hover:bg-brand-dark sm:col-span-2">
            Create template
          </button>
        </form>
      )}

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {templates.map((t) => (
          <div key={t.id} className="rounded-xl border border-slate-200 bg-white dark:bg-slate-800 shadow-card transition-shadow hover:shadow-card-hover p-4">
            <div className="flex items-center justify-between">
              <p className="font-medium text-slate-800">{t.name}</p>
              <span className="rounded-lg bg-brand-50 dark:bg-slate-700 px-2 py-0.5 text-xs font-medium text-brand-700 dark:text-brand-200">{t.channel}</span>
            </div>
            {t.subject && <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Subject: {t.subject}</p>}
            <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600">{t.body}</p>
          </div>
        ))}
        {templates.length === 0 && <p className="text-sm text-slate-400">No templates yet.</p>}
      </div>
    </AppShell>
  );
}
