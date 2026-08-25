'use client';

import { FormEvent, useEffect, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { useAuth } from '@/lib/auth-context';
import { api, ApiError } from '@/lib/api';
import { AssetStatus, AssetType, Role, type AssetDTO, type EmployeeDTO } from '@holiday-vibez/shared';

const STATUS_STYLES: Record<string, string> = {
  AVAILABLE: 'bg-blue-100 text-blue-700',
  ASSIGNED: 'bg-emerald-100 text-emerald-700',
  RETURNED: 'bg-slate-200 text-slate-600',
  RETIRED: 'bg-red-100 text-red-700',
};

const TYPE_LABELS: Record<string, string> = {
  LAPTOP: 'Laptop',
  DESKTOP: 'Desktop',
  PHONE: 'Phone',
  SIM_CARD: 'SIM card',
  MONITOR: 'Monitor',
  ACCESS_CARD: 'Access card',
  OTHER: 'Other',
};

export default function AssetsPage() {
  const { user: me } = useAuth();
  const canManage =
    me?.role === Role.ADMIN || me?.role === Role.DIRECTOR || me?.role === Role.BRANCH_MANAGER;
  const canRetire = me?.role === Role.ADMIN || me?.role === Role.DIRECTOR;

  const [assets, setAssets] = useState<AssetDTO[]>([]);
  const [mine, setMine] = useState<AssetDTO[]>([]);
  const [employees, setEmployees] = useState<EmployeeDTO[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    assetTag: '',
    type: AssetType.LAPTOP as AssetType,
    name: '',
    serialNumber: '',
    notes: '',
  });
  const [assigning, setAssigning] = useState<string | null>(null);
  const [assignUserId, setAssignUserId] = useState('');

  async function load() {
    try {
      setMine(await api.get<AssetDTO[]>('/assets/me'));
    } catch {
      setMine([]);
    }
    if (!canManage) return;
    try {
      const q = statusFilter ? `?status=${statusFilter}` : '';
      const [a, e] = await Promise.all([
        api.get<AssetDTO[]>(`/assets${q}`),
        api.get<EmployeeDTO[]>('/employees'),
      ]);
      setAssets(a);
      setEmployees(e);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load assets');
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me?.role, statusFilter]);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await api.post('/assets', {
        assetTag: form.assetTag,
        type: form.type,
        name: form.name,
        serialNumber: form.serialNumber || undefined,
        notes: form.notes || undefined,
      });
      setForm({ assetTag: '', type: AssetType.LAPTOP, name: '', serialNumber: '', notes: '' });
      setShowForm(false);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to add asset');
    } finally {
      setSaving(false);
    }
  }

  async function act(path: string, body?: unknown) {
    setError(null);
    try {
      await api.patch(path, body);
      setAssigning(null);
      setAssignUserId('');
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Action failed');
    }
  }

  return (
    <AppShell>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-brand-700">Assets</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Company property issued to staff. Exit clearance is blocked while anything is still out.
          </p>
        </div>
        {canManage && (
          <button
            onClick={() => setShowForm((v) => !v)}
            className="rounded-xl bg-gradient-to-br from-brand-600 to-brand-500 px-4 py-2 text-sm font-medium text-white shadow-md shadow-brand-500/25 hover:opacity-90"
          >
            {showForm ? 'Cancel' : '+ Add Asset'}
          </button>
        )}
      </div>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      {/* Everyone sees what they personally hold. */}
      <section className="mt-4 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
        <h2 className="text-sm font-semibold text-brand-700">Issued to me</h2>
        {mine.length === 0 ? (
          <p className="mt-2 text-sm text-slate-400">Nothing is currently issued to you.</p>
        ) : (
          <ul className="mt-2 space-y-1 text-sm text-slate-700 dark:text-slate-200">
            {mine.map((a) => (
              <li key={a.id}>
                <span className="font-mono text-xs text-slate-500">{a.assetTag}</span> · {a.name}{' '}
                <span className="text-xs text-slate-400">({TYPE_LABELS[a.type]})</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {canManage && showForm && (
        <form
          onSubmit={handleCreate}
          className="mt-4 grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-3 dark:border-slate-700 dark:bg-slate-800"
        >
          <input
            required
            placeholder="Asset tag (e.g. HV-LAP-014)"
            value={form.assetTag}
            onChange={(e) => setForm({ ...form, assetTag: e.target.value })}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900"
          />
          <select
            value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value as AssetType })}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900"
          >
            {Object.values(AssetType).map((t) => (
              <option key={t} value={t}>
                {TYPE_LABELS[t]}
              </option>
            ))}
          </select>
          <input
            required
            placeholder="Name (e.g. MacBook Air M2)"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900"
          />
          <input
            placeholder="Serial number"
            value={form.serialNumber}
            onChange={(e) => setForm({ ...form, serialNumber: e.target.value })}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900"
          />
          <input
            placeholder="Notes"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm sm:col-span-2 dark:border-slate-600 dark:bg-slate-900"
          />
          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-gradient-to-br from-brand-600 to-brand-500 px-4 py-2 text-sm font-medium text-white shadow-md shadow-brand-500/25 hover:opacity-90 disabled:opacity-60"
          >
            {saving ? 'Saving…' : 'Add Asset'}
          </button>
        </form>
      )}

      {canManage && (
        <>
          <div className="mt-6 flex flex-wrap items-center gap-2">
            <span className="text-xs uppercase text-slate-400">Filter</span>
            {['', ...Object.values(AssetStatus)].map((s) => (
              <button
                key={s || 'all'}
                onClick={() => setStatusFilter(s)}
                className={`rounded-lg px-3 py-1 text-xs font-medium ${
                  statusFilter === s
                    ? 'bg-brand text-white'
                    : 'border border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300'
                }`}
              >
                {s || 'All'}
              </button>
            ))}
          </div>

          <div className="mt-2 overflow-x-auto rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
            <table className="w-full text-sm">
              <thead className="bg-brand-50/60 text-left text-xs font-semibold uppercase tracking-wide text-brand-700 dark:bg-slate-900/40 dark:text-brand-300">
                <tr>
                  <th className="px-4 py-2">Tag</th>
                  <th className="px-4 py-2">Asset</th>
                  <th className="px-4 py-2">Status</th>
                  <th className="px-4 py-2">Holder</th>
                  <th className="px-4 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {assets.map((a) => (
                  <tr key={a.id} className="border-t border-slate-100 dark:border-slate-700">
                    <td className="px-4 py-2 font-mono text-xs text-slate-500">{a.assetTag}</td>
                    <td className="px-4 py-2">
                      <div className="font-medium text-slate-800 dark:text-slate-100">{a.name}</div>
                      <div className="text-xs text-slate-400">
                        {TYPE_LABELS[a.type]}
                        {a.serialNumber ? ` · SN ${a.serialNumber}` : ''}
                      </div>
                    </td>
                    <td className="px-4 py-2">
                      <span className={`rounded-lg px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[a.status]}`}>
                        {a.status}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-slate-600 dark:text-slate-300">
                      {a.assignedTo?.name ?? <span className="text-slate-400">—</span>}
                    </td>
                    <td className="px-4 py-2 text-right">
                      {assigning === a.id ? (
                        <div className="flex items-center justify-end gap-2">
                          <select
                            value={assignUserId}
                            onChange={(e) => setAssignUserId(e.target.value)}
                            className="rounded border border-slate-300 px-2 py-1 text-xs dark:border-slate-600 dark:bg-slate-900"
                          >
                            <option value="">Select employee…</option>
                            {employees.map((emp) => (
                              <option key={emp.id} value={emp.id}>
                                {emp.name}
                              </option>
                            ))}
                          </select>
                          <button
                            disabled={!assignUserId}
                            onClick={() => act(`/assets/${a.id}/assign`, { userId: assignUserId })}
                            className="text-xs text-brand hover:underline disabled:opacity-40"
                          >
                            Confirm
                          </button>
                          <button onClick={() => setAssigning(null)} className="text-xs text-slate-400 hover:underline">
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-end gap-2 text-xs">
                          {a.status !== 'ASSIGNED' && a.status !== 'RETIRED' && (
                            <button onClick={() => setAssigning(a.id)} className="text-brand hover:underline">
                              Assign
                            </button>
                          )}
                          {a.status === 'ASSIGNED' && (
                            <button onClick={() => act(`/assets/${a.id}/return`)} className="text-brand hover:underline">
                              Mark returned
                            </button>
                          )}
                          {canRetire && a.status !== 'RETIRED' && a.status !== 'ASSIGNED' && (
                            <button onClick={() => act(`/assets/${a.id}/retire`)} className="text-red-600 hover:underline">
                              Retire
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
                {assets.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-slate-400">
                      No assets recorded yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </AppShell>
  );
}
