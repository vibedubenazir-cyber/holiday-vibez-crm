'use client';

import { FormEvent, useEffect, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { useAuth } from '@/lib/auth-context';
import { api, ApiError } from '@/lib/api';
import { Role, ClientType, type ClientDTO } from '@holiday-vibez/shared';

const TYPE_OPTIONS = [ClientType.INDIVIDUAL, ClientType.AGENT, ClientType.CORPORATE, ClientType.GROUP];

export default function ClientsPage() {
  const { user: me } = useAuth();
  const [clients, setClients] = useState<ClientDTO[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const canManage = me?.role === Role.ADMIN || me?.role === Role.DIRECTOR;

  const [form, setForm] = useState({
    type: ClientType.INDIVIDUAL as string,
    name: '',
    phone: '',
    email: '',
    gstNumber: '',
    commissionPct: '',
    notes: '',
  });

  async function load() {
    try {
      setClients(await api.get<ClientDTO[]>('/clients'));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load clients');
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api.post('/clients', {
        ...form,
        phone: form.phone || undefined,
        email: form.email || undefined,
        gstNumber: form.gstNumber || undefined,
        commissionPct: form.commissionPct ? Number(form.commissionPct) : undefined,
        notes: form.notes || undefined,
      });
      setForm({ type: ClientType.INDIVIDUAL, name: '', phone: '', email: '', gstNumber: '', commissionPct: '', notes: '' });
      setShowForm(false);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to create client. Only Admin/Director can manage clients.');
    }
  }

  async function handleToggleActive(c: ClientDTO) {
    try {
      await api.patch(`/clients/${c.id}`, { active: !c.active });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to update client');
    }
  }

  return (
    <AppShell>
      <div className="flex items-center justify-between">
        <h1 className="inline-block rounded-lg bg-white px-4 py-2 text-xl font-bold tracking-tight text-brand shadow-card">Clients</h1>
        {canManage && (
          <button onClick={() => setShowForm((s) => !s)} className="rounded-lg bg-gradient-to-r from-brand to-brand-500 px-3 py-1.5 text-sm font-medium text-white shadow-card transition-all hover:shadow-card-hover hover:brightness-105">
            {showForm ? 'Cancel' : 'Add client'}
          </button>
        )}
      </div>
      <p className="mt-1 text-xs text-blue-100">
        Individuals, travel agents, corporate accounts, and group bookings — optionally link a Lead to one of these from the Leads page.
        {!canManage && ' Read-only — only Admin/Director can manage clients.'}
      </p>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      {canManage && showForm && (
        <form onSubmit={handleCreate} className="mt-4 grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-white shadow-card transition-shadow hover:shadow-card-hover p-4 sm:grid-cols-2 lg:grid-cols-3">
          <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-100 transition-colors">
            {TYPE_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <input required placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-100 transition-colors" />
          <input placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-100 transition-colors" />
          <input type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-100 transition-colors" />
          {form.type === ClientType.CORPORATE && (
            <input placeholder="GST number" value={form.gstNumber} onChange={(e) => setForm({ ...form, gstNumber: e.target.value })} className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-100 transition-colors" />
          )}
          {form.type === ClientType.AGENT && (
            <input type="number" step="0.01" placeholder="Commission %" value={form.commissionPct} onChange={(e) => setForm({ ...form, commissionPct: e.target.value })} className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-100 transition-colors" />
          )}
          <input placeholder="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-100 transition-colors sm:col-span-2 lg:col-span-3" />
          <button type="submit" className="rounded-lg bg-brand px-3 py-2 text-sm font-medium text-white hover:bg-brand-dark sm:col-span-2 lg:col-span-3">
            Create client
          </button>
        </form>
      )}

      <div className="mt-4 overflow-hidden bg-white">
        <table className="w-full text-sm">
          <thead className="bg-brand-50/60 text-left text-xs font-semibold uppercase tracking-wide text-brand-700">
            <tr>
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Type</th>
              <th className="px-4 py-2">Contact</th>
              <th className="px-4 py-2">Status</th>
              {canManage && <th className="px-4 py-2 text-right">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {clients.map((c) => (
              <tr key={c.id} className="border-t border-slate-100">
                <td className="px-4 py-2 font-medium text-slate-800">{c.name}</td>
                <td className="px-4 py-2">{c.type}</td>
                <td className="px-4 py-2 text-slate-500">{c.email ?? '—'} {c.phone ? `· ${c.phone}` : ''}</td>
                <td className="px-4 py-2">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${c.active ? 'bg-blue-100 text-blue-700' : 'bg-slate-200 text-slate-600'}`}>
                    {c.active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                {canManage && (
                  <td className="px-4 py-2 text-right">
                    <button onClick={() => handleToggleActive(c)} className="text-brand hover:underline">
                      {c.active ? 'Deactivate' : 'Activate'}
                    </button>
                  </td>
                )}
              </tr>
            ))}
            {clients.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-6 text-center text-slate-400">No clients yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}
