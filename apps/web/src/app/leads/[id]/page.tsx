'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { AppShell } from '@/components/AppShell';
import { api, ApiError } from '@/lib/api';
import type { LeadSummaryDTO, QuotationSummaryDTO } from '@holiday-vibez/shared';

interface TravelerRow {
  id: string;
  name: string;
  passportNumber: string | null;
  passportExpiry: string | null;
  visaStatus: string | null;
}

export default function LeadDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [lead, setLead] = useState<LeadSummaryDTO | null>(null);
  const [travelers, setTravelers] = useState<TravelerRow[]>([]);
  const [quotations, setQuotations] = useState<QuotationSummaryDTO[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', passportNumber: '', passportExpiry: '', visaStatus: '' });

  async function load() {
    try {
      const [leads, t, q] = await Promise.all([
        api.get<LeadSummaryDTO[]>('/leads'),
        api.get<TravelerRow[]>(`/leads/${id}/travelers`),
        api.get<QuotationSummaryDTO[]>('/quotations'),
      ]);
      setLead(leads.find((l) => l.id === id) ?? null);
      setTravelers(t);
      setQuotations(q.filter((qq) => qq.leadId === id));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load lead');
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function handleAddTraveler(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api.post(`/leads/${id}/travelers`, {
        ...form,
        passportExpiry: form.passportExpiry || undefined,
      });
      setForm({ name: '', passportNumber: '', passportExpiry: '', visaStatus: '' });
      setShowForm(false);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to add traveler');
    }
  }

  async function handleCreateQuotation() {
    try {
      const q = await api.post<QuotationSummaryDTO>('/quotations', { leadId: id });
      router.push(`/quotations/${q.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to create quotation');
    }
  }

  if (!lead) {
    return (
      <AppShell>
        <p className="text-sm text-slate-500">{error ?? 'Loading...'}</p>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-slate-800">{lead.clientName}</h1>
          <p className="text-sm text-slate-500">{lead.destination} · {lead.phone} · {lead.status}</p>
        </div>
        <button onClick={handleCreateQuotation} className="rounded-md bg-brand px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-dark">
          Create quotation
        </button>
      </div>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div>
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-700">Travelers</h2>
            <button onClick={() => setShowForm((s) => !s)} className="text-sm text-brand hover:underline">
              {showForm ? 'Cancel' : '+ Add traveler'}
            </button>
          </div>
          {showForm && (
            <form onSubmit={handleAddTraveler} className="mt-2 grid grid-cols-1 gap-2 rounded-lg border border-slate-200 bg-white p-3">
              <input required placeholder="Full name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
              <input placeholder="Passport number" value={form.passportNumber} onChange={(e) => setForm({ ...form, passportNumber: e.target.value })} className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
              <input type="date" placeholder="Passport expiry" value={form.passportExpiry} onChange={(e) => setForm({ ...form, passportExpiry: e.target.value })} className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
              <input placeholder="Visa status" value={form.visaStatus} onChange={(e) => setForm({ ...form, visaStatus: e.target.value })} className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
              <button type="submit" className="rounded-md bg-brand px-3 py-2 text-sm font-medium text-white hover:bg-brand-dark">Save traveler</button>
            </form>
          )}
          <div className="mt-2 overflow-hidden rounded-lg border border-slate-200 bg-white">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr><th className="px-3 py-2">Name</th><th className="px-3 py-2">Passport</th><th className="px-3 py-2">Expiry</th><th className="px-3 py-2">Visa</th></tr>
              </thead>
              <tbody>
                {travelers.map((t) => (
                  <tr key={t.id} className="border-t border-slate-100">
                    <td className="px-3 py-2">{t.name}</td>
                    <td className="px-3 py-2 text-slate-500">{t.passportNumber ?? '—'}</td>
                    <td className="px-3 py-2 text-slate-500">{t.passportExpiry ? new Date(t.passportExpiry).toLocaleDateString() : '—'}</td>
                    <td className="px-3 py-2 text-slate-500">{t.visaStatus ?? '—'}</td>
                  </tr>
                ))}
                {travelers.length === 0 && <tr><td colSpan={4} className="px-3 py-4 text-center text-slate-400">No travelers added yet.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <h2 className="text-sm font-semibold text-slate-700">Quotations</h2>
          <div className="mt-2 overflow-hidden rounded-lg border border-slate-200 bg-white">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr><th className="px-3 py-2">Ref</th><th className="px-3 py-2">Status</th><th className="px-3 py-2">Total</th><th></th></tr>
              </thead>
              <tbody>
                {quotations.map((q) => (
                  <tr key={q.id} className="border-t border-slate-100">
                    <td className="px-3 py-2">{q.refNo}</td>
                    <td className="px-3 py-2">{q.status}</td>
                    <td className="px-3 py-2">₹{Number(q.totalAmount).toLocaleString('en-IN')}</td>
                    <td className="px-3 py-2 text-right"><a href={`/quotations/${q.id}`} className="text-brand hover:underline">Open</a></td>
                  </tr>
                ))}
                {quotations.length === 0 && <tr><td colSpan={4} className="px-3 py-4 text-center text-slate-400">No quotations yet.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
