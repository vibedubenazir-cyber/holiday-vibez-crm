'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/AppShell';
import { Modal } from '@/components/Modal';
import { api, ApiError } from '@/lib/api';
import { TransportationType, type ItineraryPlanSummaryDTO, type LeadSummaryDTO } from '@holiday-vibez/shared';

type CreateForm = {
  title: string;
  leadId: string;
  destinations: string;
  startDate: string;
  endDate: string;
  adultsCount: number;
  childrenCount: number;
  infantsCount: number;
  notes: string;
  theme: string;
  showOnWebsite: boolean;
  websitePerPersonPrice: string;
  websiteValidUntil: string;
  isPopular: boolean;
  isSpecial: boolean;
  aboutPackage: string;
};

const EMPTY_CREATE_FORM: CreateForm = {
  title: '',
  leadId: '',
  destinations: '',
  startDate: '',
  endDate: '',
  adultsCount: 2,
  childrenCount: 0,
  infantsCount: 0,
  notes: '',
  theme: '',
  showOnWebsite: false,
  websitePerPersonPrice: '',
  websiteValidUntil: '',
  isPopular: false,
  isSpecial: false,
  aboutPackage: '',
};

type AiForm = {
  destinations: string;
  startDate: string;
  endDate: string;
  adultsCount: number;
  childrenCount: number;
  theme: string;
  sightseeing: string;
  hotel: string;
  hotelCategory: string;
  transport: string;
  transportType: TransportationType | '';
  mealPlan: string;
  pickupCity: string;
  budget: string;
  freeText: string;
  notes: string;
};

const EMPTY_AI_FORM: AiForm = {
  destinations: '',
  startDate: '',
  endDate: '',
  adultsCount: 2,
  childrenCount: 0,
  theme: '',
  sightseeing: '',
  hotel: '',
  hotelCategory: '',
  transport: '',
  transportType: '',
  mealPlan: '',
  pickupCity: '',
  budget: '',
  freeText: '',
  notes: '',
};

function formatDate(value: string | null) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function ItinerariesPage() {
  const router = useRouter();
  const [items, setItems] = useState<ItineraryPlanSummaryDTO[]>([]);
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showAiCreate, setShowAiCreate] = useState(false);
  const [createForm, setCreateForm] = useState<CreateForm>(EMPTY_CREATE_FORM);
  const [aiForm, setAiForm] = useState<AiForm>(EMPTY_AI_FORM);
  const [saving, setSaving] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [leads, setLeads] = useState<LeadSummaryDTO[]>([]);

  // Lazily loaded for the create modal's "Link to Lead" picker — /leads is
  // already role-scoped server-side (consultants get their own, BMs their
  // branch), so whatever comes back is safe to offer.
  useEffect(() => {
    if (!showCreate || leads.length > 0) return;
    api.get<LeadSummaryDTO[]>('/leads').then(setLeads).catch(() => setLeads([]));
  }, [showCreate, leads.length]);

  async function load() {
    try {
      setItems(await api.get<ItineraryPlanSummaryDTO[]>('/itineraries'));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load itineraries');
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const created = await api.post<{ id: string }>('/itineraries', {
        title: createForm.title,
        leadId: createForm.leadId || undefined,
        destinations: createForm.destinations.split(',').map((d) => d.trim()).filter(Boolean),
        startDate: createForm.startDate || undefined,
        endDate: createForm.endDate || undefined,
        adultsCount: Number(createForm.adultsCount),
        childrenCount: Number(createForm.childrenCount),
        infantsCount: Number(createForm.infantsCount),
        notes: createForm.notes || undefined,
        theme: createForm.theme || undefined,
        showOnWebsite: createForm.showOnWebsite,
        websitePerPersonPrice: createForm.websitePerPersonPrice ? Number(createForm.websitePerPersonPrice) : undefined,
        websiteValidUntil: createForm.websiteValidUntil || undefined,
        isPopular: createForm.isPopular,
        isSpecial: createForm.isSpecial,
        aboutPackage: createForm.aboutPackage || undefined,
      });
      router.push(`/itineraries/${created.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to create itinerary');
      setSaving(false);
    }
  }

  async function handleGenerateAi(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setAiError(null);
    try {
      const created = await api.post<{ id: string }>('/itineraries/generate-ai', {
        destinations: aiForm.destinations.split(',').map((d) => d.trim()).filter(Boolean),
        startDate: aiForm.startDate,
        endDate: aiForm.endDate,
        adultsCount: Number(aiForm.adultsCount),
        childrenCount: Number(aiForm.childrenCount),
        theme: aiForm.theme || undefined,
        sightseeing: aiForm.sightseeing || undefined,
        hotel: aiForm.hotel || undefined,
        hotelCategory: aiForm.hotelCategory || undefined,
        transport: aiForm.transport || undefined,
        transportType: aiForm.transportType || undefined,
        mealPlan: aiForm.mealPlan || undefined,
        pickupCity: aiForm.pickupCity || undefined,
        budget: aiForm.budget || undefined,
        freeText: aiForm.freeText || undefined,
        notes: aiForm.notes || undefined,
      });
      router.push(`/itineraries/${created.id}`);
    } catch (err) {
      setAiError(err instanceof ApiError ? err.message : 'Failed to generate itinerary. Try + Add New instead.');
      setSaving(false);
    }
  }

  async function handleDuplicate(id: string) {
    setError(null);
    try {
      await api.post(`/itineraries/${id}/duplicate`);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to duplicate itinerary');
    }
  }

  // Consultants look itineraries up by client name, destination or the ref no
  // they were given over the phone — match all three. Filtering client-side
  // keeps it instant; the list is per-consultant so it stays small.
  const term = search.trim().toLowerCase();
  const visible = term
    ? items.filter((i) =>
        [i.title, i.refNo, ...i.destinations].some((v) => v.toLowerCase().includes(term)),
      )
    : items;

  return (
    <AppShell>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold tracking-tight text-brand-700">Itineraries</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setShowAiCreate(true)}
            className="rounded-xl border-2 border-violet-200 bg-violet-50 px-3 py-1.5 text-sm font-semibold text-violet-700 transition hover:bg-violet-100"
          >
            ✨ Create via AI
          </button>
          <button
            onClick={() => setShowCreate(true)}
            className="rounded-xl bg-gradient-to-br from-brand-600 to-brand-500 px-3 py-1.5 text-sm font-semibold text-white shadow-md shadow-brand-500/25 transition hover:opacity-90"
          >
            + Add New
          </button>
        </div>
      </div>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      <div className="mt-4 flex items-center gap-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by title, package ID or destination…"
          className="w-full max-w-md rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-100 dark:border-slate-600 dark:bg-slate-800"
        />
        {term && (
          <span className="shrink-0 text-xs text-slate-500 dark:text-slate-400">
            {visible.length} of {items.length}
          </span>
        )}
      </div>

      <div className="mt-4 overflow-x-auto bg-white dark:bg-slate-800">
        <table className="w-full text-sm">
          <thead className="bg-brand-50/60 text-left text-xs font-semibold uppercase tracking-wide text-brand-700 dark:bg-slate-900/40 dark:text-brand-300">
            <tr>
              <th className="px-4 py-2"></th>
              <th className="px-4 py-2">Title</th>
              <th className="px-4 py-2">Duration</th>
              <th className="px-4 py-2">Price</th>
              <th className="px-4 py-2">Website Cost</th>
              <th className="px-4 py-2">Website</th>
              <th className="px-4 py-2">Last Updated</th>
              <th className="px-4 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((item) => (
              <tr key={item.id} className="border-t border-slate-100 dark:border-slate-700">
                <td className="px-4 py-2">
                  {item.coverPhotoUrl ? (
                    <img src={item.coverPhotoUrl} alt="" className="h-12 w-16 rounded-lg object-cover" />
                  ) : (
                    <div className="flex h-12 w-16 items-center justify-center rounded-lg bg-slate-100 text-[9px] font-semibold uppercase tracking-wide text-slate-400 dark:bg-slate-700">
                      No Photo
                    </div>
                  )}
                </td>
                <td className="px-4 py-2">
                  <div className="font-medium text-slate-800 dark:text-slate-100">{item.title}</div>
                  <div className="text-xs text-slate-400">#{item.refNo} · {item.destinations.join(', ')}</div>
                </td>
                <td className="whitespace-nowrap px-4 py-2 text-slate-600 dark:text-slate-300">{item.duration ?? '—'}</td>
                <td className="whitespace-nowrap px-4 py-2 text-slate-600 dark:text-slate-300">
                  {item.price !== null ? `INR ${Number(item.price).toLocaleString('en-IN')}` : '—'}
                </td>
                <td className="whitespace-nowrap px-4 py-2 text-slate-600 dark:text-slate-300">
                  {item.websitePerPersonPrice !== null ? `INR ${Number(item.websitePerPersonPrice).toLocaleString('en-IN')}` : '—'}
                </td>
                <td className="px-4 py-2">
                  <span
                    className={`rounded-lg px-2 py-0.5 text-xs font-medium ${item.showOnWebsite ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}
                  >
                    {item.showOnWebsite ? 'Yes' : 'No'}
                  </span>
                </td>
                <td className="whitespace-nowrap px-4 py-2 text-slate-500 dark:text-slate-400">{formatDate(item.updatedAt)}</td>
                <td className="px-4 py-2">
                  <div className="flex items-center justify-end gap-1.5 whitespace-nowrap">
                    <button
                      onClick={() => handleDuplicate(item.id)}
                      title="Duplicate this itinerary"
                      className="rounded-lg border border-brand-200 bg-white px-2.5 py-1 text-xs font-semibold text-brand transition hover:bg-brand-50"
                    >
                      Copy
                    </button>
                    <button
                      onClick={() => router.push(`/itineraries/${item.id}`)}
                      className="rounded-lg bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand transition hover:bg-brand-100"
                    >
                      Edit
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {visible.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-6 text-center text-slate-400">
                  {items.length === 0 ? 'No itineraries yet.' : `No itineraries match “${search}”.`}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showCreate && (
        <Modal title="Create Itinerary" onClose={() => setShowCreate(false)} wide>
          <form onSubmit={handleCreate} className="grid grid-cols-2 gap-3">
            <input
              required
              placeholder="Itinerary Name"
              value={createForm.title}
              onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
              className="col-span-2 rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <label className="text-xs text-slate-500">
              Start Date
              <input type="date" value={createForm.startDate} onChange={(e) => setCreateForm({ ...createForm, startDate: e.target.value })} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            </label>
            <label className="text-xs text-slate-500">
              End Date
              <input type="date" value={createForm.endDate} onChange={(e) => setCreateForm({ ...createForm, endDate: e.target.value })} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            </label>
            <label className="text-xs text-slate-500">
              Adults
              <input type="number" min={0} value={createForm.adultsCount} onChange={(e) => setCreateForm({ ...createForm, adultsCount: Number(e.target.value) })} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            </label>
            <label className="text-xs text-slate-500">
              Children
              <input type="number" min={0} value={createForm.childrenCount} onChange={(e) => setCreateForm({ ...createForm, childrenCount: Number(e.target.value) })} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            </label>
            <label className="text-xs text-slate-500">
              Infants
              <input type="number" min={0} value={createForm.infantsCount} onChange={(e) => setCreateForm({ ...createForm, infantsCount: Number(e.target.value) })} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            </label>
            <input
              placeholder="Destinations (comma separated)"
              value={createForm.destinations}
              onChange={(e) => setCreateForm({ ...createForm, destinations: e.target.value })}
              className="col-span-2 rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <label className="col-span-2 text-xs text-slate-500">
              Link to Lead (optional — enables one-click send to the client)
              <select
                value={createForm.leadId}
                onChange={(e) => setCreateForm({ ...createForm, leadId: e.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="">No lead linked</option>
                {leads.map((lead) => (
                  <option key={lead.id} value={lead.id}>
                    {lead.clientName} — {lead.destination} ({lead.phone})
                  </option>
                ))}
              </select>
            </label>
            <textarea
              placeholder="Notes"
              rows={2}
              value={createForm.notes}
              onChange={(e) => setCreateForm({ ...createForm, notes: e.target.value })}
              className="col-span-2 rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />

            <div className="col-span-2 mt-2 border-t border-slate-100 pt-3 text-sm font-semibold text-slate-700 dark:text-slate-200">Website Setting</div>
            <input
              placeholder="Theme"
              value={createForm.theme}
              onChange={(e) => setCreateForm({ ...createForm, theme: e.target.value })}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
              <input type="checkbox" checked={createForm.showOnWebsite} onChange={(e) => setCreateForm({ ...createForm, showOnWebsite: e.target.checked })} />
              Show on Website
            </label>
            <label className="text-xs text-slate-500">
              Per Person Price
              <input type="number" min={0} value={createForm.websitePerPersonPrice} onChange={(e) => setCreateForm({ ...createForm, websitePerPersonPrice: e.target.value })} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            </label>
            <label className="text-xs text-slate-500">
              Validity
              <input type="date" value={createForm.websiteValidUntil} onChange={(e) => setCreateForm({ ...createForm, websiteValidUntil: e.target.value })} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
              <input type="checkbox" checked={createForm.isPopular} onChange={(e) => setCreateForm({ ...createForm, isPopular: e.target.checked })} />
              Popular
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
              <input type="checkbox" checked={createForm.isSpecial} onChange={(e) => setCreateForm({ ...createForm, isSpecial: e.target.checked })} />
              Special
            </label>
            <textarea
              placeholder="About Package"
              rows={2}
              value={createForm.aboutPackage}
              onChange={(e) => setCreateForm({ ...createForm, aboutPackage: e.target.value })}
              className="col-span-2 rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />

            <button type="submit" disabled={saving} className="col-span-2 mt-2 rounded-xl bg-gradient-to-br from-brand-600 to-brand-500 shadow-md shadow-brand-500/25 px-3 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60">
              {saving ? 'Creating…' : 'Create'}
            </button>
          </form>
        </Modal>
      )}

      {showAiCreate && (
        <Modal title="Create Itinerary via AI" onClose={() => setShowAiCreate(false)} wide>
          <form onSubmit={handleGenerateAi} className="grid grid-cols-2 gap-3">
            <input
              required
              placeholder="Destinations (comma separated)"
              value={aiForm.destinations}
              onChange={(e) => setAiForm({ ...aiForm, destinations: e.target.value })}
              className="col-span-2 rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <label className="text-xs text-slate-500">
              Start Date
              <input required type="date" value={aiForm.startDate} onChange={(e) => setAiForm({ ...aiForm, startDate: e.target.value })} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            </label>
            <label className="text-xs text-slate-500">
              End Date
              <input required type="date" value={aiForm.endDate} onChange={(e) => setAiForm({ ...aiForm, endDate: e.target.value })} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            </label>
            <label className="text-xs text-slate-500">
              Adults
              <input type="number" min={1} value={aiForm.adultsCount} onChange={(e) => setAiForm({ ...aiForm, adultsCount: Number(e.target.value) })} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            </label>
            <label className="text-xs text-slate-500">
              Children
              <input type="number" min={0} value={aiForm.childrenCount} onChange={(e) => setAiForm({ ...aiForm, childrenCount: Number(e.target.value) })} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            </label>
            <input placeholder="Theme" value={aiForm.theme} onChange={(e) => setAiForm({ ...aiForm, theme: e.target.value })} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            <input placeholder="Sightseeing preferences" value={aiForm.sightseeing} onChange={(e) => setAiForm({ ...aiForm, sightseeing: e.target.value })} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            <input placeholder="Hotel (preferred name, optional)" value={aiForm.hotel} onChange={(e) => setAiForm({ ...aiForm, hotel: e.target.value })} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            <input placeholder="Hotel Category" value={aiForm.hotelCategory} onChange={(e) => setAiForm({ ...aiForm, hotelCategory: e.target.value })} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            <input placeholder="Transport" value={aiForm.transport} onChange={(e) => setAiForm({ ...aiForm, transport: e.target.value })} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            <select value={aiForm.transportType} onChange={(e) => setAiForm({ ...aiForm, transportType: e.target.value as TransportationType | '' })} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
              <option value="">Transport Type</option>
              <option value={TransportationType.PRIVATE}>Private</option>
              <option value={TransportationType.SIC}>Seat-in-Coach</option>
            </select>
            <input placeholder="Meal Plan" value={aiForm.mealPlan} onChange={(e) => setAiForm({ ...aiForm, mealPlan: e.target.value })} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            <input placeholder="Pickup City" value={aiForm.pickupCity} onChange={(e) => setAiForm({ ...aiForm, pickupCity: e.target.value })} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            <input placeholder="Budget" value={aiForm.budget} onChange={(e) => setAiForm({ ...aiForm, budget: e.target.value })} className="col-span-2 rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            <textarea
              placeholder="Describe Your Trip Plan"
              rows={3}
              value={aiForm.freeText}
              onChange={(e) => setAiForm({ ...aiForm, freeText: e.target.value })}
              className="col-span-2 rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <textarea
              placeholder="Notes"
              rows={2}
              value={aiForm.notes}
              onChange={(e) => setAiForm({ ...aiForm, notes: e.target.value })}
              className="col-span-2 rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />

            {aiError && <p className="col-span-2 text-sm text-red-600">{aiError}</p>}

            <button type="submit" disabled={saving} className="col-span-2 mt-2 rounded-xl bg-gradient-to-br from-brand-600 to-brand-500 shadow-md shadow-brand-500/25 px-3 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60">
              {saving ? 'Generating…' : 'Generate Itinerary'}
            </button>
          </form>
        </Modal>
      )}
    </AppShell>
  );
}
