'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/AppShell';
import { useAuth } from '@/lib/auth-context';
import { api, ApiError } from '@/lib/api';
import { Role, type LeadSummaryDTO, type PackageDTO, type RateCardDTO, type QuotationSummaryDTO } from '@holiday-vibez/shared';

export default function PackagesPage() {
  const { user: me } = useAuth();
  const router = useRouter();
  const [packages, setPackages] = useState<PackageDTO[]>([]);
  const [rates, setRates] = useState<RateCardDTO[]>([]);
  const [leads, setLeads] = useState<LeadSummaryDTO[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const canManage = me?.role === Role.ADMIN || me?.role === Role.BRANCH_MANAGER;
  const canBuildQuotation = me?.role === Role.TRAVEL_CONSULTANT || me?.role === Role.ADMIN;

  const [form, setForm] = useState({ name: '', destination: '', theme: '', durationDays: '3', basePrice: '', currency: 'INR' });
  const [itemForm, setItemForm] = useState({ rateCardId: '', dayNumber: '1', description: '', quantity: '1' });
  const [leadPick, setLeadPick] = useState<Record<string, string>>({});

  async function load() {
    try {
      const [p, r, l] = await Promise.all([
        api.get<PackageDTO[]>('/packages'),
        api.get<RateCardDTO[]>('/rates'),
        api.get<LeadSummaryDTO[]>('/leads'),
      ]);
      setPackages(p);
      setRates(r);
      setLeads(l);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load packages');
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api.post('/packages', {
        ...form,
        durationDays: Number(form.durationDays),
        basePrice: form.basePrice ? Number(form.basePrice) : undefined,
        theme: form.theme || undefined,
      });
      setForm({ name: '', destination: '', theme: '', durationDays: '3', basePrice: '', currency: 'INR' });
      setShowForm(false);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to create package');
    }
  }

  async function handleAddItem(packageId: string) {
    setError(null);
    try {
      await api.post(`/packages/${packageId}/items`, {
        rateCardId: itemForm.rateCardId,
        dayNumber: Number(itemForm.dayNumber),
        description: itemForm.description,
        quantity: Number(itemForm.quantity),
      });
      setItemForm({ rateCardId: '', dayNumber: '1', description: '', quantity: '1' });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to add item');
    }
  }

  async function handleBuildQuotation(packageId: string) {
    const leadId = leadPick[packageId];
    if (!leadId) {
      setError('Pick a lead first');
      return;
    }
    setError(null);
    try {
      const quotation = await api.post<QuotationSummaryDTO>(`/packages/${packageId}/build-quotation`, { leadId });
      router.push(`/quotations/${quotation.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to build quotation from package');
    }
  }

  return (
    <AppShell>
      <div className="flex items-center justify-between">
        <h1 className="inline-block rounded-lg bg-white px-4 py-2 text-xl font-bold tracking-tight text-brand shadow-card">Packages</h1>
        {canManage && (
          <button onClick={() => setShowForm((s) => !s)} className="rounded-lg bg-gradient-to-r from-brand to-brand-500 px-3 py-1.5 text-sm font-medium text-white shadow-card transition-all hover:shadow-card-hover hover:brightness-105">
            {showForm ? 'Cancel' : 'Add package'}
          </button>
        )}
      </div>
      <p className="mt-1 text-sm text-blue-100">
        Reusable itinerary templates. Consultants can build a ready-costed draft quotation from any package in one click.
      </p>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      {canManage && showForm && (
        <form onSubmit={handleCreate} className="mt-4 grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-white shadow-card transition-shadow hover:shadow-card-hover p-4 sm:grid-cols-2 lg:grid-cols-3">
          <input required placeholder="Package name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-100 transition-colors" />
          <input required placeholder="Destination" value={form.destination} onChange={(e) => setForm({ ...form, destination: e.target.value })} className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-100 transition-colors" />
          <input placeholder="Theme (e.g. Honeymoon)" value={form.theme} onChange={(e) => setForm({ ...form, theme: e.target.value })} className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-100 transition-colors" />
          <input required type="number" min={1} placeholder="Duration (days)" value={form.durationDays} onChange={(e) => setForm({ ...form, durationDays: e.target.value })} className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-100 transition-colors" />
          <input type="number" placeholder="Base price (indicative)" value={form.basePrice} onChange={(e) => setForm({ ...form, basePrice: e.target.value })} className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-100 transition-colors" />
          <input placeholder="Currency" value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-100 transition-colors" />
          <button type="submit" className="rounded-lg bg-brand px-3 py-2 text-sm font-medium text-white hover:bg-brand-dark sm:col-span-2 lg:col-span-3">
            Create package
          </button>
        </form>
      )}

      <div className="mt-4 space-y-3">
        {packages.map((p) => (
          <div key={p.id} className="rounded-xl border border-slate-200 bg-white shadow-card transition-shadow hover:shadow-card-hover p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-slate-800">{p.name} · {p.destination}</p>
                <p className="text-xs text-slate-500">
                  {p.durationDays} days{p.theme ? ` · ${p.theme}` : ''} · {p.items?.length ?? 0} items
                </p>
              </div>
              <button onClick={() => setExpanded(expanded === p.id ? null : p.id)} className="text-sm text-brand hover:underline">
                {expanded === p.id ? 'Hide details' : 'View details'}
              </button>
            </div>

            {expanded === p.id && (
              <div className="mt-3 border-t border-slate-100 pt-3">
                <table className="w-full text-sm">
                  <thead className="text-left text-xs font-semibold uppercase tracking-wide text-brand">
                    <tr><th className="py-1">Day</th><th className="py-1">Description</th><th className="py-1">Rate card</th><th className="py-1">Qty</th></tr>
                  </thead>
                  <tbody>
                    {(p.items ?? []).map((item) => (
                      <tr key={item.id} className="border-t border-slate-100">
                        <td className="py-1">{item.dayNumber}</td>
                        <td className="py-1">{item.description}</td>
                        <td className="py-1 text-slate-500">{item.rateCard?.name}</td>
                        <td className="py-1">{item.quantity}</td>
                      </tr>
                    ))}
                    {(!p.items || p.items.length === 0) && (
                      <tr><td colSpan={4} className="py-2 text-center text-slate-400">No items yet.</td></tr>
                    )}
                  </tbody>
                </table>

                {canManage && (
                  <div className="mt-3 flex flex-wrap items-end gap-2">
                    <select value={itemForm.rateCardId} onChange={(e) => setItemForm({ ...itemForm, rateCardId: e.target.value })} className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-100 transition-colors">
                      <option value="">Rate card...</option>
                      {rates.map((r) => <option key={r.id} value={r.id}>{r.name} ({r.destination})</option>)}
                    </select>
                    <input type="number" min={1} placeholder="Day #" value={itemForm.dayNumber} onChange={(e) => setItemForm({ ...itemForm, dayNumber: e.target.value })} className="w-20 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-100 transition-colors" />
                    <input placeholder="Description" value={itemForm.description} onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })} className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-100 transition-colors" />
                    <input type="number" min={1} placeholder="Qty" value={itemForm.quantity} onChange={(e) => setItemForm({ ...itemForm, quantity: e.target.value })} className="w-16 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-100 transition-colors" />
                    <button onClick={() => handleAddItem(p.id)} className="rounded-lg bg-brand px-3 py-2 text-sm font-medium text-white hover:bg-brand-dark">Add item</button>
                  </div>
                )}

                {canBuildQuotation && (
                  <div className="mt-3 flex items-end gap-2 border-t border-slate-100 pt-3">
                    <select
                      value={leadPick[p.id] ?? ''}
                      onChange={(e) => setLeadPick({ ...leadPick, [p.id]: e.target.value })}
                      className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-100 transition-colors"
                    >
                      <option value="">Pick a lead...</option>
                      {leads.map((l) => <option key={l.id} value={l.id}>{l.clientName} · {l.destination}</option>)}
                    </select>
                    <button onClick={() => handleBuildQuotation(p.id)} className="rounded-lg bg-brand px-3 py-2 text-sm font-medium text-white hover:bg-brand-dark">
                      Build quotation from package
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
        {packages.length === 0 && <p className="text-sm text-slate-400">No packages yet.</p>}
      </div>
    </AppShell>
  );
}
