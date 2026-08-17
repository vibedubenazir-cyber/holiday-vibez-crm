'use client';

import { FormEvent, useEffect, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { useAuth } from '@/lib/auth-context';
import { api, ApiError } from '@/lib/api';
import { CustomFieldType, Role, type CustomFieldDefinitionDTO } from '@holiday-vibez/shared';

const ENTITY_TYPES = ['LEAD', 'TRAVELER', 'BOOKING'];
const FIELD_TYPES = [CustomFieldType.TEXT, CustomFieldType.NUMBER, CustomFieldType.DATE, CustomFieldType.BOOLEAN, CustomFieldType.SELECT];

export default function CustomFieldsPage() {
  const { user: me } = useAuth();
  const canManage = me?.role === Role.ADMIN || me?.role === Role.DIRECTOR;
  const [entityType, setEntityType] = useState('LEAD');
  const [definitions, setDefinitions] = useState<CustomFieldDefinitionDTO[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const [form, setForm] = useState({
    label: '',
    fieldKey: '',
    fieldType: CustomFieldType.TEXT as string,
    options: '',
    required: false,
  });

  async function load() {
    try {
      setDefinitions(await api.get<CustomFieldDefinitionDTO[]>(`/custom-fields/definitions?entityType=${entityType}`));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load custom field definitions');
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityType]);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api.post('/custom-fields/definitions', {
        entityType,
        label: form.label,
        fieldKey: form.fieldKey || form.label.toLowerCase().replace(/[^a-z0-9]+/g, '_'),
        fieldType: form.fieldType,
        options: form.fieldType === CustomFieldType.SELECT ? form.options.split(',').map((o) => o.trim()).filter(Boolean) : undefined,
        required: form.required,
      });
      setForm({ label: '', fieldKey: '', fieldType: CustomFieldType.TEXT, options: '', required: false });
      setShowForm(false);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to create field. Only Admin/Director can manage custom fields.');
    }
  }

  async function handleToggleActive(def: CustomFieldDefinitionDTO) {
    try {
      await api.patch(`/custom-fields/definitions/${def.id}`, { active: !def.active });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to update field');
    }
  }

  return (
    <AppShell>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold tracking-tight text-brand-700">Custom Fields</h1>
        {canManage && (
          <button onClick={() => setShowForm((s) => !s)} className="rounded-xl bg-gradient-to-br from-brand-600 to-brand-500 px-3 py-1.5 text-sm font-semibold text-white shadow-md shadow-brand-500/25 transition hover:opacity-90">
            {showForm ? 'Cancel' : 'Add field'}
          </button>
        )}
      </div>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        Add fields to entities without a code change — they render automatically wherever that entity is edited (e.g. the Lead detail page).
      </p>
      {!canManage && <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Read-only — only Admin/Director can manage custom fields.</p>}
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      <div className="mt-4 flex gap-1 rounded-lg border border-slate-200 bg-white dark:bg-slate-800 p-1 text-sm">
        {ENTITY_TYPES.map((t) => (
          <button
            key={t}
            onClick={() => setEntityType(t)}
            className={`rounded px-3 py-1.5 font-medium ${entityType === t ? 'bg-brand text-white' : 'text-slate-600'}`}
          >
            {t.charAt(0) + t.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      {canManage && showForm && (
        <form onSubmit={handleCreate} className="mt-4 grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-white dark:bg-slate-800 shadow-card transition-shadow hover:shadow-card-hover p-4 sm:grid-cols-2 lg:grid-cols-3">
          <input required placeholder="Label (e.g. Referred By)" value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-100 transition-colors" />
          <input placeholder="Field key (auto from label if blank)" value={form.fieldKey} onChange={(e) => setForm({ ...form, fieldKey: e.target.value })} className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-100 transition-colors" />
          <select value={form.fieldType} onChange={(e) => setForm({ ...form, fieldType: e.target.value })} className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-100 transition-colors">
            {FIELD_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          {form.fieldType === CustomFieldType.SELECT && (
            <input placeholder="Options, comma-separated" value={form.options} onChange={(e) => setForm({ ...form, options: e.target.value })} className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-100 transition-colors sm:col-span-2 lg:col-span-2" />
          )}
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input type="checkbox" checked={form.required} onChange={(e) => setForm({ ...form, required: e.target.checked })} />
            Required
          </label>
          <button type="submit" className="rounded-xl bg-gradient-to-br from-brand-600 to-brand-500 shadow-md shadow-brand-500/25 px-3 py-2 text-sm font-medium text-white hover:opacity-90 sm:col-span-2 lg:col-span-3">
            Create field
          </button>
        </form>
      )}

      <div className="mt-4 overflow-hidden bg-white dark:bg-slate-800">
        <table className="w-full text-sm">
          <thead className="bg-brand-50/60 text-left text-xs font-semibold uppercase tracking-wide text-brand-700 dark:bg-slate-900/40 dark:text-brand-300">
            <tr>
              <th className="px-4 py-2">Label</th>
              <th className="px-4 py-2">Key</th>
              <th className="px-4 py-2">Type</th>
              <th className="px-4 py-2">Required</th>
              <th className="px-4 py-2">Status</th>
              {canManage && <th className="px-4 py-2 text-right">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {definitions.map((d) => (
              <tr key={d.id} className="border-t border-slate-100">
                <td className="px-4 py-2 font-medium text-slate-800">{d.label}</td>
                <td className="px-4 py-2 text-slate-500">{d.fieldKey}</td>
                <td className="px-4 py-2">{d.fieldType}{d.fieldType === 'SELECT' ? ` (${d.options.join(', ')})` : ''}</td>
                <td className="px-4 py-2">{d.required ? 'Yes' : 'No'}</td>
                <td className="px-4 py-2">
                  <span className={`rounded-lg px-2 py-0.5 text-xs font-medium ${d.active ? 'bg-blue-100 text-blue-700' : 'bg-slate-200 text-slate-600'}`}>
                    {d.active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                {canManage && (
                  <td className="px-4 py-2 text-right">
                    <button onClick={() => handleToggleActive(d)} className="text-brand hover:underline">
                      {d.active ? 'Deactivate' : 'Activate'}
                    </button>
                  </td>
                )}
              </tr>
            ))}
            {definitions.length === 0 && (
              <tr><td colSpan={canManage ? 6 : 5} className="px-4 py-6 text-center text-slate-400">No custom fields for {entityType.toLowerCase()} yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}
