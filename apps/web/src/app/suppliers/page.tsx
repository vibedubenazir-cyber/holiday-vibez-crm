'use client';

import { FormEvent, useEffect, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { useAuth } from '@/lib/auth-context';
import { api, ApiError } from '@/lib/api';
import { Role, SupplierType, type SupplierDTO } from '@holiday-vibez/shared';

const TYPE_OPTIONS = [SupplierType.HOTEL, SupplierType.FLIGHT, SupplierType.ACTIVITY, SupplierType.TRANSFER, SupplierType.DMC, SupplierType.OTHER];

export default function SuppliersPage() {
  const { user: me } = useAuth();
  const [suppliers, setSuppliers] = useState<SupplierDTO[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const canManage = me?.role === Role.ADMIN || me?.role === Role.DIRECTOR;

  const [form, setForm] = useState({
    type: SupplierType.DMC as string,
    name: '',
    contactName: '',
    phone: '',
    email: '',
    destination: '',
    paymentTerms: '',
  });

  async function load() {
    try {
      setSuppliers(await api.get<SupplierDTO[]>('/suppliers'));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load suppliers');
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api.post('/suppliers', {
        ...form,
        contactName: form.contactName || undefined,
        phone: form.phone || undefined,
        email: form.email || undefined,
        destination: form.destination || undefined,
        paymentTerms: form.paymentTerms || undefined,
      });
      setForm({ type: SupplierType.DMC, name: '', contactName: '', phone: '', email: '', destination: '', paymentTerms: '' });
      setShowForm(false);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to create supplier. Only Admin/Director can manage suppliers.');
    }
  }

  async function handleToggleActive(s: SupplierDTO) {
    try {
      await api.patch(`/suppliers/${s.id}`, { active: !s.active });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to update supplier');
    }
  }

  return (
    <AppShell>
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">Suppliers</h1>
        {canManage && (
          <button onClick={() => setShowForm((s) => !s)} className="rounded-lg bg-gradient-to-r from-brand to-brand-500 px-3 py-1.5 text-sm font-medium text-white shadow-card transition-all hover:shadow-card-hover hover:brightness-105">
            {showForm ? 'Cancel' : 'Add supplier'}
          </button>
        )}
      </div>
      {!canManage && <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">Read-only — only Admin/Director can manage suppliers.</p>}

      {error && <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>}

      {canManage && showForm && (
        <form onSubmit={handleCreate} className="mt-4 grid grid-cols-1 gap-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-card transition-shadow hover:shadow-card-hover p-4 sm:grid-cols-2 lg:grid-cols-3">
          <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm">
            {TYPE_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <input required placeholder="Supplier name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm" />
          <input placeholder="Destination" value={form.destination} onChange={(e) => setForm({ ...form, destination: e.target.value })} className="rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm" />
          <input placeholder="Contact name" value={form.contactName} onChange={(e) => setForm({ ...form, contactName: e.target.value })} className="rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm" />
          <input placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm" />
          <input type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm" />
          <input placeholder="Payment terms" value={form.paymentTerms} onChange={(e) => setForm({ ...form, paymentTerms: e.target.value })} className="rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm sm:col-span-2 lg:col-span-3" />
          <button type="submit" className="rounded-lg bg-brand px-3 py-2 text-sm font-medium text-white hover:bg-brand-dark sm:col-span-2 lg:col-span-3">
            Create supplier
          </button>
        </form>
      )}

      <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-card transition-shadow hover:shadow-card-hover">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 dark:bg-slate-900 text-left text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
            <tr>
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Type</th>
              <th className="px-4 py-2">Destination</th>
              <th className="px-4 py-2">Contact</th>
              <th className="px-4 py-2">Status</th>
              {canManage && <th className="px-4 py-2 text-right">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {suppliers.map((s) => (
              <tr key={s.id} className="border-t border-slate-100 dark:border-slate-800">
                <td className="px-4 py-2 font-medium text-slate-800 dark:text-slate-100">{s.name}</td>
                <td className="px-4 py-2">{s.type}</td>
                <td className="px-4 py-2">{s.destination ?? '—'}</td>
                <td className="px-4 py-2 text-slate-500 dark:text-slate-400">{s.contactName ?? '—'} {s.phone ? `· ${s.phone}` : ''}</td>
                <td className="px-4 py-2">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${s.active ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' : 'bg-slate-200 text-slate-600 dark:text-slate-300'}`}>
                    {s.active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                {canManage && (
                  <td className="px-4 py-2 text-right">
                    <button onClick={() => handleToggleActive(s)} className="text-brand hover:underline">
                      {s.active ? 'Deactivate' : 'Activate'}
                    </button>
                  </td>
                )}
              </tr>
            ))}
            {suppliers.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-6 text-center text-slate-400 dark:text-slate-500">No suppliers yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}
