'use client';

import { FormEvent, useEffect, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { useAuth } from '@/lib/auth-context';
import { api, ApiError } from '@/lib/api';
import { Role, type HrSettingDTO } from '@holiday-vibez/shared';

const SETTING_FIELDS: { key: string; label: string; hint: string; fallback: number }[] = [
  { key: 'leave_quota_sick', label: 'Sick leave quota (days/year)', hint: 'Used by Leave balance calculations', fallback: 10 },
  { key: 'leave_quota_casual', label: 'Casual leave quota (days/year)', hint: 'Used by Leave balance calculations', fallback: 12 },
  { key: 'leave_quota_annual', label: 'Annual leave quota (days/year)', hint: 'Used by Leave balance calculations', fallback: 18 },
  { key: 'standard_notice_period_days', label: 'Standard notice period (days)', hint: 'Reference policy value for resignations', fallback: 30 },
  { key: 'probation_period_days', label: 'Probation period (days)', hint: 'Auto-calculates each employee’s probation end date from their joining date', fallback: 90 },
];

export default function HrSettingsPage() {
  const { user: me } = useAuth();
  const canManage = me?.role === Role.ADMIN || me?.role === Role.DIRECTOR;
  const [settings, setSettings] = useState<HrSettingDTO[]>([]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);

  async function load() {
    try {
      const rows = await api.get<HrSettingDTO[]>('/hr-settings');
      setSettings(rows);
      const map: Record<string, string> = {};
      for (const f of SETTING_FIELDS) {
        map[f.key] = rows.find((r) => r.key === f.key)?.value ?? String(f.fallback);
      }
      setValues(map);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load HR settings');
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSave(e: FormEvent, key: string) {
    e.preventDefault();
    setError(null);
    setSaved(null);
    setSaving(key);
    try {
      await api.put('/hr-settings', { key, value: values[key] });
      setSaved(key);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to save setting');
    } finally {
      setSaving(null);
    }
  }

  return (
    <AppShell>
      <h1 className="inline-block rounded-lg bg-brand-50 px-4 py-2 text-xl font-bold tracking-tight text-brand shadow-card">HR Settings</h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        Org-wide HR policy values. Leave quotas feed directly into Leave balance checks; probation period auto-calculates each employee&apos;s probation end date.
      </p>
      {!canManage && <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Read-only — only Admin/Director can edit these values.</p>}
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {SETTING_FIELDS.map((f) => (
          <form
            key={f.key}
            onSubmit={(e) => handleSave(e, f.key)}
            className="rounded-xl border border-slate-200 bg-white dark:bg-slate-800 dark:border-slate-700 shadow-card transition-shadow hover:shadow-card-hover p-4"
          >
            <label className="text-sm font-medium text-slate-800 dark:text-slate-100">{f.label}</label>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{f.hint}</p>
            <div className="mt-2 flex items-center gap-2">
              <input
                type="number"
                min={0}
                disabled={!canManage}
                value={values[f.key] ?? ''}
                onChange={(e) => setValues({ ...values, [f.key]: e.target.value })}
                className="w-28 rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-900 px-3 py-1.5 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-100 transition-colors disabled:bg-slate-50 dark:disabled:bg-slate-800"
              />
              {canManage && (
                <button
                  type="submit"
                  disabled={saving === f.key}
                  className="rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-brand-700 disabled:opacity-50"
                >
                  {saving === f.key ? 'Saving…' : 'Save'}
                </button>
              )}
              {saved === f.key && <span className="text-xs font-medium text-emerald-600">Saved</span>}
            </div>
            {!settings.find((s) => s.key === f.key) && (
              <p className="mt-1 text-xs text-slate-400">Not yet configured — showing built-in default.</p>
            )}
          </form>
        ))}
      </div>
    </AppShell>
  );
}
