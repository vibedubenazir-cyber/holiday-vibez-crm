'use client';

import { FormEvent, useEffect, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { useAuth } from '@/lib/auth-context';
import { api, ApiError } from '@/lib/api';
import { CmsContentType, Role, type CmsContentDTO, type SiteSettingDTO } from '@holiday-vibez/shared';

const TYPE_TABS = [CmsContentType.BLOG, CmsContentType.BANNER, CmsContentType.DESTINATION, CmsContentType.TESTIMONIAL, CmsContentType.GALLERY];
const TYPE_LABELS: Record<string, string> = {
  BLOG: 'Blog',
  BANNER: 'Banners',
  DESTINATION: 'Destinations',
  TESTIMONIAL: 'Testimonials',
  GALLERY: 'Gallery',
};

export default function CmsPage() {
  const { user: me } = useAuth();
  const [type, setType] = useState<string>(CmsContentType.BLOG);
  const [content, setContent] = useState<CmsContentDTO[]>([]);
  const [settings, setSettings] = useState<SiteSettingDTO[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const canManage = me?.role === Role.ADMIN || me?.role === Role.DIRECTOR;

  const [form, setForm] = useState({ title: '', subtitle: '', body: '', imageUrl: '', linkUrl: '', rating: '' });
  const [settingForm, setSettingForm] = useState({ key: '', value: '' });

  async function load() {
    try {
      const [c, s] = await Promise.all([
        api.get<CmsContentDTO[]>(`/cms/content?type=${type}`),
        canManage ? api.get<SiteSettingDTO[]>('/cms/settings') : Promise.resolve([]),
      ]);
      setContent(c);
      setSettings(s);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load CMS content');
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type]);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api.post('/cms/content', {
        type,
        title: form.title,
        subtitle: form.subtitle || undefined,
        body: form.body || undefined,
        imageUrl: form.imageUrl || undefined,
        linkUrl: form.linkUrl || undefined,
        rating: type === CmsContentType.TESTIMONIAL && form.rating ? Number(form.rating) : undefined,
      });
      setForm({ title: '', subtitle: '', body: '', imageUrl: '', linkUrl: '', rating: '' });
      setShowForm(false);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to create content. Only Admin/Director can manage CMS.');
    }
  }

  async function handleToggleActive(item: CmsContentDTO) {
    try {
      await api.patch(`/cms/content/${item.id}`, { active: !item.active });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to update content');
    }
  }

  async function handleSaveSetting(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api.put('/cms/settings', settingForm);
      setSettingForm({ key: '', value: '' });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to save setting');
    }
  }

  return (
    <AppShell>
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Website CMS</h1>
        {canManage && (
          <div className="flex gap-2">
            <button onClick={() => setShowSettings((s) => !s)} className="rounded-md border border-slate-300 dark:border-slate-600 px-3 py-1.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700">
              {showSettings ? 'Hide settings' : 'Site settings'}
            </button>
            <button onClick={() => setShowForm((s) => !s)} className="rounded-md bg-brand px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-dark">
              {showForm ? 'Cancel' : 'Add content'}
            </button>
          </div>
        )}
      </div>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        Content for the public site (www.holidayvibez.com) to consume via <code>GET /public/cms/content</code>.
      </p>
      {!canManage && <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">Read-only — only Admin/Director can manage CMS content.</p>}

      {error && <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>}

      {canManage && showSettings && (
        <div className="mt-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
          <p className="text-sm font-medium text-slate-800 dark:text-slate-100">Site settings</p>
          <ul className="mt-2 space-y-1">
            {settings.map((s) => (
              <li key={s.id} className="flex justify-between text-sm">
                <span className="text-slate-500 dark:text-slate-400">{s.key}</span>
                <span className="text-slate-800 dark:text-slate-100">{s.value}</span>
              </li>
            ))}
            {settings.length === 0 && <li className="text-sm text-slate-400 dark:text-slate-500">No settings yet.</li>}
          </ul>
          <form onSubmit={handleSaveSetting} className="mt-3 flex gap-2">
            <input required placeholder="Key (e.g. contact_email)" value={settingForm.key} onChange={(e) => setSettingForm({ ...settingForm, key: e.target.value })} className="rounded-md border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm" />
            <input required placeholder="Value" value={settingForm.value} onChange={(e) => setSettingForm({ ...settingForm, value: e.target.value })} className="flex-1 rounded-md border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm" />
            <button type="submit" className="rounded-md bg-brand px-3 py-2 text-sm font-medium text-white hover:bg-brand-dark">Save</button>
          </form>
        </div>
      )}

      <div className="mt-4 flex gap-1 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-1 text-sm">
        {TYPE_TABS.map((t) => (
          <button
            key={t}
            onClick={() => setType(t)}
            className={`rounded px-3 py-1.5 font-medium ${type === t ? 'bg-brand text-white' : 'text-slate-600 dark:text-slate-300'}`}
          >
            {TYPE_LABELS[t]}
          </button>
        ))}
      </div>

      {canManage && showForm && (
        <form onSubmit={handleCreate} className="mt-4 grid grid-cols-1 gap-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 sm:grid-cols-2">
          <input required placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="rounded-md border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm sm:col-span-2" />
          <input placeholder="Subtitle" value={form.subtitle} onChange={(e) => setForm({ ...form, subtitle: e.target.value })} className="rounded-md border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm sm:col-span-2" />
          <input placeholder="Image URL" value={form.imageUrl} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} className="rounded-md border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm" />
          <input placeholder="Link URL" value={form.linkUrl} onChange={(e) => setForm({ ...form, linkUrl: e.target.value })} className="rounded-md border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm" />
          {type === CmsContentType.TESTIMONIAL && (
            <input type="number" min={1} max={5} placeholder="Rating (1-5)" value={form.rating} onChange={(e) => setForm({ ...form, rating: e.target.value })} className="rounded-md border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm" />
          )}
          <textarea placeholder="Body / quote text" value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} rows={3} className="rounded-md border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm sm:col-span-2" />
          <button type="submit" className="rounded-md bg-brand px-3 py-2 text-sm font-medium text-white hover:bg-brand-dark sm:col-span-2">
            Create {TYPE_LABELS[type]}
          </button>
        </form>
      )}

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {content.map((item) => (
          <div key={item.id} className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
            <div className="flex items-start justify-between">
              <p className="font-medium text-slate-800 dark:text-slate-100">{item.title}</p>
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${item.active ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' : 'bg-slate-200 text-slate-600 dark:text-slate-300'}`}>
                {item.active ? 'Active' : 'Inactive'}
              </span>
            </div>
            {item.subtitle && <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{item.subtitle}</p>}
            {item.rating && <p className="mt-1 text-sm text-amber-500 dark:text-amber-400">{'★'.repeat(item.rating)}</p>}
            {item.body && <p className="mt-2 line-clamp-3 text-sm text-slate-600 dark:text-slate-300">{item.body}</p>}
            {canManage && (
              <button onClick={() => handleToggleActive(item)} className="mt-3 text-sm text-brand hover:underline">
                {item.active ? 'Deactivate' : 'Activate'}
              </button>
            )}
          </div>
        ))}
        {content.length === 0 && <p className="text-sm text-slate-400 dark:text-slate-500">No {TYPE_LABELS[type].toLowerCase()} yet.</p>}
      </div>
    </AppShell>
  );
}
