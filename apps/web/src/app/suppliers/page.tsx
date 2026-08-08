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
  const canManage = me?.role === Role.ADMIN || me?.role === Role.DIRECTOR || me?.role === Role.FINANCE;

  const [form, setForm] = useState({
    type: SupplierType.DMC as string,
    name: '',
    contactName: '',
    phone: '',
    email: '',
    destination: '',
    gstin: '',
    address: '',
    paymentTerms: '',
  });

  async function load() {
    try {
      setSuppliers(await api.get<SupplierDTO[]>('/suppliers'));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load vendors');
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
        gstin: form.gstin || undefined,
        address: form.address || undefined,
        paymentTerms: form.paymentTerms || undefined,
      });
      setForm({ type: SupplierType.DMC, name: '', contactName: '', phone: '', email: '', destination: '', gstin: '', address: '', paymentTerms: '' });
      setShowForm(false);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to create vendor. Only Admin/Director can manage vendors.');
    }
  }

  async function handleToggleActive(s: SupplierDTO) {
    try {
      await api.patch(`/suppliers/${s.id}`, { active: !s.active });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to update vendor');
    }
  }

  return (
    <AppShell>
      <div className="flex items-center justify-between">
        <h1 className="inline-block rounded-lg bg-brand-50 px-4 py-2 text-xl font-bold tracking-tight text-brand shadow-card">Vendors</h1>
        {canManage && (
          <button onClick={() => setShowForm((s) => !s)} className="rounded-lg bg-gradient-to-r from-brand to-brand-500 px-3 py-1.5 text-sm font-medium text-white shadow-card transition-all hover:shadow-card-hover hover:brightness-105">
            {showForm ? 'Cancel' : 'Add vendor'}
          </button>
        )}
      </div>
      <p className="mt-1 text-sm text-blue-100">
        Hotels, DMCs, flights, and other suppliers you pay. Outstanding balance is computed from unpaid payments linked to each vendor.
      </p>
      {!canManage && <p className="mt-1 text-xs text-blue-100">Read-only — only Admin/Director/Finance can manage vendors.</p>}

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      {canManage && showForm && (
        <form onSubmit={handleCreate} className="mt-4 grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-brand-50 shadow-card transition-shadow hover:shadow-card-hover p-4 sm:grid-cols-2 lg:grid-cols-3">
          <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-100 transition-colors">
            {TYPE_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <input required placeholder="Vendor name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-100 transition-colors" />
          <input placeholder="Destination" value={form.destination} onChange={(e) => setForm({ ...form, destination: e.target.value })} className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-100 transition-colors" />
          <input placeholder="Contact name" value={form.contactName} onChange={(e) => setForm({ ...form, contactName: e.target.value })} className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-100 transition-colors" />
          <input placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-100 transition-colors" />
          <input type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-100 transition-colors" />
          <input placeholder="GSTIN" value={form.gstin} onChange={(e) => setForm({ ...form, gstin: e.target.value.toUpperCase() })} className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-100 transition-colors" />
          <input placeholder="Address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-100 transition-colors sm:col-span-2" />
          <input placeholder="Payment terms" value={form.paymentTerms} onChange={(e) => setForm({ ...form, paymentTerms: e.target.value })} className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-100 transition-colors sm:col-span-2 lg:col-span-3" />
          <button type="submit" className="rounded-lg bg-brand px-3 py-2 text-sm font-medium text-white hover:bg-brand-dark sm:col-span-2 lg:col-span-3">
            Create vendor
          </button>
        </form>
      )}

      <div className="mt-4 overflow-hidden bg-brand-50">
        <table className="w-full text-sm">
          <thead className="bg-brand-50/60 text-left text-xs font-semibold uppercase tracking-wide text-brand-700">
            <tr>
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Type</th>
              <th className="px-4 py-2">GSTIN</th>
              <th className="px-4 py-2">Contact</th>
              <th className="px-4 py-2">Outstanding</th>
              <th className="px-4 py-2">Status</th>
              {canManage && <th className="px-4 py-2 text-right">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {suppliers.map((s) => (
              <tr key={s.id} className="border-t border-slate-100">
                <td className="px-4 py-2 font-medium text-slate-800">
                  {s.name}
                  {s.destination && <span className="ml-1.5 text-xs text-slate-400">{s.destination}</span>}
                </td>
                <td className="px-4 py-2">{s.type}</td>
                <td className="px-4 py-2 text-slate-500">{s.gstin ?? '—'}</td>
                <td className="px-4 py-2 text-slate-500">{s.contactName ?? '—'} {s.phone ? `· ${s.phone}` : ''}</td>
                <td className="px-4 py-2">
                  {s.outstandingBalance > 0 ? (
                    <span className="rounded-lg bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                      ₹{s.outstandingBalance.toLocaleString('en-IN')}
                    </span>
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
                </td>
                <td className="px-4 py-2">
                  <span className={`rounded-lg px-2 py-0.5 text-xs font-medium ${s.active ? 'bg-blue-100 text-blue-700' : 'bg-slate-200 text-slate-600'}`}>
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
              <tr><td colSpan={7} className="px-4 py-6 text-center text-slate-400">No vendors yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}
