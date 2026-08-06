'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { AppShell } from '@/components/AppShell';
import { api, ApiError } from '@/lib/api';
import { CustomFieldType, type CustomFieldDefinitionDTO, type CustomFieldValueDTO, type LeadSummaryDTO, type QuotationSummaryDTO } from '@holiday-vibez/shared';

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
  const [customFieldDefs, setCustomFieldDefs] = useState<CustomFieldDefinitionDTO[]>([]);
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, string>>({});

  async function load() {
    try {
      const [leads, t, q, defs, values] = await Promise.all([
        api.get<LeadSummaryDTO[]>('/leads'),
        api.get<TravelerRow[]>(`/leads/${id}/travelers`),
        api.get<QuotationSummaryDTO[]>('/quotations'),
        api.get<CustomFieldDefinitionDTO[]>('/custom-fields/definitions?entityType=LEAD'),
        api.get<CustomFieldValueDTO[]>(`/custom-fields/values?entityType=LEAD&entityId=${id}`),
      ]);
      setLead(leads.find((l) => l.id === id) ?? null);
      setTravelers(t);
      setQuotations(q.filter((qq) => qq.leadId === id));
      setCustomFieldDefs(defs.filter((d) => d.active));
      setCustomFieldValues(Object.fromEntries(values.map((v) => [v.definitionId, v.value])));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load lead');
    }
  }

  async function handleSaveCustomFields(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api.put('/custom-fields/values', {
        entityType: 'LEAD',
        entityId: id,
        values: customFieldDefs.map((d) => ({ definitionId: d.id, value: customFieldValues[d.id] ?? '' })),
      });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to save custom fields');
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
          <h1 className="inline-block rounded-lg bg-white px-4 py-2 text-xl font-bold tracking-tight text-brand shadow-card">{lead.clientName}</h1>
          <p className="text-sm text-slate-500">{lead.destination} · {lead.phone} · {lead.status}</p>
        </div>
        <button onClick={handleCreateQuotation} className="rounded-lg bg-gradient-to-r from-brand to-brand-500 px-3 py-1.5 text-sm font-medium text-white shadow-card transition-all hover:shadow-card-hover hover:brightness-105">
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
            <form onSubmit={handleAddTraveler} className="mt-2 grid grid-cols-1 gap-2 rounded-xl border border-slate-200 bg-white shadow-card transition-shadow hover:shadow-card-hover p-3">
              <input required placeholder="Full name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-100 transition-colors" />
              <input placeholder="Passport number" value={form.passportNumber} onChange={(e) => setForm({ ...form, passportNumber: e.target.value })} className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-100 transition-colors" />
              <input type="date" placeholder="Passport expiry" value={form.passportExpiry} onChange={(e) => setForm({ ...form, passportExpiry: e.target.value })} className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-100 transition-colors" />
              <input placeholder="Visa status" value={form.visaStatus} onChange={(e) => setForm({ ...form, visaStatus: e.target.value })} className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-100 transition-colors" />
              <button type="submit" className="rounded-lg bg-brand px-3 py-2 text-sm font-medium text-white hover:bg-brand-dark">Save traveler</button>
            </form>
          )}
          <div className="mt-2 overflow-hidden bg-white">
            <table className="w-full text-sm">
              <thead className="bg-brand-50/60 text-left text-xs font-semibold uppercase tracking-wide text-brand-700">
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
          <div className="mt-2 overflow-hidden bg-white">
            <table className="w-full text-sm">
              <thead className="bg-brand-50/60 text-left text-xs font-semibold uppercase tracking-wide text-brand-700">
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

      {customFieldDefs.length > 0 && (
        <div className="mt-6">
          <h2 className="text-sm font-semibold text-slate-700">Custom Fields</h2>
          <form onSubmit={handleSaveCustomFields} className="mt-2 grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-white shadow-card transition-shadow hover:shadow-card-hover p-4 sm:grid-cols-2 lg:grid-cols-3">
            {customFieldDefs.map((d) => (
              <div key={d.id}>
                <label className="mb-1 block text-xs font-medium text-slate-600">
                  {d.label}{d.required ? ' *' : ''}
                </label>
                {d.fieldType === CustomFieldType.BOOLEAN ? (
                  <input
                    type="checkbox"
                    checked={customFieldValues[d.id] === 'true'}
                    onChange={(e) => setCustomFieldValues({ ...customFieldValues, [d.id]: e.target.checked ? 'true' : 'false' })}
                  />
                ) : d.fieldType === CustomFieldType.SELECT ? (
                  <select
                    required={d.required}
                    value={customFieldValues[d.id] ?? ''}
                    onChange={(e) => setCustomFieldValues({ ...customFieldValues, [d.id]: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-100 transition-colors"
                  >
                    <option value="">Select...</option>
                    {d.options.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                ) : (
                  <input
                    required={d.required}
                    type={d.fieldType === CustomFieldType.NUMBER ? 'number' : d.fieldType === CustomFieldType.DATE ? 'date' : 'text'}
                    value={customFieldValues[d.id] ?? ''}
                    onChange={(e) => setCustomFieldValues({ ...customFieldValues, [d.id]: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-100 transition-colors"
                  />
                )}
              </div>
            ))}
            <button type="submit" className="rounded-lg bg-brand px-3 py-2 text-sm font-medium text-white hover:bg-brand-dark sm:col-span-2 lg:col-span-3">
              Save custom fields
            </button>
          </form>
        </div>
      )}
    </AppShell>
  );
}
