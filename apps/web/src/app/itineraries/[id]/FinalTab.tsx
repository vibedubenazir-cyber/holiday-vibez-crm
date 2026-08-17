'use client';

import { useEffect, useRef, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { ItineraryEventType, type ItineraryPlanDTO, type ItineraryPricingOptionTotalsDTO, type LeadSummaryDTO } from '@holiday-vibez/shared';
import { ItineraryReport, type ItineraryReportData } from '@/components/ItineraryReport';

export function FinalTab({ plan, onReload }: { plan: ItineraryPlanDTO; onReload: () => void }) {
  const [totals, setTotals] = useState<ItineraryPricingOptionTotalsDTO[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [leads, setLeads] = useState<LeadSummaryDTO[]>([]);
  const [sending, setSending] = useState(false);
  const sendingRef = useRef(false);
  const [sentMsg, setSentMsg] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<{ refNo: string; options: ItineraryPricingOptionTotalsDTO[] }>(`/itineraries/${plan.id}/pricing-summary`)
      .then((s) => setTotals(s.options))
      .catch(() => setTotals([]));
  }, [plan]);

  useEffect(() => {
    api.get<LeadSummaryDTO[]>('/leads').then(setLeads).catch(() => setLeads([]));
  }, []);

  async function handleLinkLead(leadId: string) {
    setError(null);
    try {
      await api.patch(`/itineraries/${plan.id}`, { leadId: leadId || null });
      onReload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to link lead');
    }
  }

  async function handleSend() {
    // Same ref guard as the quotation send: state updates are batched, so a
    // double-click could fire two WhatsApp/email sends before `sending` flips.
    if (!plan.lead || sendingRef.current) return;
    const confirmed = window.confirm(
      `Send itinerary ${plan.refNo} to ${plan.lead.clientName}?\n\nWhatsApp: ${plan.lead.phone}\nEmail: ${plan.lead.email ?? '(none on file — WhatsApp only)'}\n\n${
        plan.status !== 'READY_TO_SHARE' ? 'The itinerary will be published first so the link works.\n\n' : ''
      }Double-check these are correct before sending.`,
    );
    if (!confirmed) return;
    sendingRef.current = true;
    setSending(true);
    setError(null);
    setSentMsg(null);
    try {
      const res = await api.post<{ sent: boolean; url: string }>(`/itineraries/${plan.id}/send`);
      setShareUrl(res.url);
      setSentMsg(`Sent to ${plan.lead.clientName} via WhatsApp${plan.lead.email ? ' and email' : ''}.`);
      onReload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to send itinerary');
    } finally {
      sendingRef.current = false;
      setSending(false);
    }
  }

  async function handlePublish() {
    setPublishing(true);
    setError(null);
    try {
      const res = await api.post<{ url: string }>(`/itineraries/${plan.id}/publish`);
      setShareUrl(res.url);
      onReload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to publish itinerary');
    } finally {
      setPublishing(false);
    }
  }

  async function handleCopy(url: string) {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const data: ItineraryReportData = {
    refNo: plan.refNo,
    title: plan.title,
    destinations: plan.destinations,
    startDate: plan.startDate,
    endDate: plan.endDate,
    adultsCount: plan.adultsCount,
    childrenCount: plan.childrenCount,
    infantsCount: plan.infantsCount,
    coverPhotoUrl: plan.coverPhotoUrl,
    days: plan.days.map((day) => ({
      id: day.id,
      dayNumber: day.dayNumber,
      date: day.date,
      events: day.events.map((e) => ({ id: e.id, type: e.type, name: e.name, destination: e.destination, date: e.date, description: e.description, photoUrl: e.photoUrl, details: e.details })),
    })),
    images: plan.images.map((i) => ({ id: i.id, url: i.url, caption: i.caption })),
    packageTerms: plan.packageTerms,
    pricingOptions: plan.pricingOptions.map((option) => {
      const t = totals.find((x) => x.optionId === option.id);
      return {
        id: option.id,
        label: option.label,
        totalIncludingGst: t?.totalIncludingGst ?? 0,
        accommodations: option.accommodations
          .filter((a) => a.type === ItineraryEventType.ACCOMMODATION)
          .map((a) => ({
            id: a.id,
            name: a.name,
            destination: a.destination,
            date: a.date,
            endDate: a.endDate,
            photoUrl: a.photoUrl,
            description: a.description,
            details: a.details,
          })),
      };
    }),
  };

  const publicUrl = shareUrl ?? (plan.status === 'READY_TO_SHARE' ? `${window.location.origin}/itinerary/${plan.id}/final` : null);

  return (
    <div className="mt-4">
      <div className="no-print mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white dark:bg-slate-800 p-4">
        <div className="text-sm text-slate-600 dark:text-slate-300">
          Status: <span className="font-semibold">{plan.status}</span>
          {publicUrl && (
            <div className="mt-1 flex items-center gap-2">
              <input readOnly value={publicUrl} className="w-72 rounded border border-slate-200 bg-slate-50 px-2 py-1 text-xs" />
              <button onClick={() => handleCopy(publicUrl)} className="rounded-lg border border-slate-200 px-2 py-1 text-xs hover:bg-brand-50 hover:text-brand">
                {copied ? 'Copied!' : 'Copy Link'}
              </button>
              <a
                href={`${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api'}/public/itineraries/${plan.id}/pdf`}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg border border-slate-200 px-2 py-1 text-xs hover:bg-brand-50 hover:text-brand"
              >
                Download PDF
              </a>
            </div>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="text-xs text-slate-500">
            Client (lead)
            <select
              value={plan.leadId ?? ''}
              onChange={(e) => handleLinkLead(e.target.value)}
              className="ml-2 rounded-lg border border-slate-300 px-2 py-1.5 text-xs"
            >
              <option value="">Not linked</option>
              {/* keep the current link selectable even if /leads didn't return it (e.g. reassigned) */}
              {plan.lead && !leads.some((l) => l.id === plan.leadId) && (
                <option value={plan.lead.id}>
                  {plan.lead.clientName} ({plan.lead.phone})
                </option>
              )}
              {leads.map((lead) => (
                <option key={lead.id} value={lead.id}>
                  {lead.clientName} — {lead.destination} ({lead.phone})
                </option>
              ))}
            </select>
          </label>
          <button
            onClick={handleSend}
            disabled={!plan.lead || sending}
            title={!plan.lead ? 'Link a lead first — the client contact details come from the lead' : undefined}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {sending ? 'Sending…' : 'Send to Client'}
          </button>
          <button onClick={handlePublish} disabled={publishing} className="rounded-xl bg-gradient-to-br from-brand-600 to-brand-500 shadow-md shadow-brand-500/25 px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60">
            {publishing ? 'Publishing…' : 'Publish / Get Shareable Link'}
          </button>
        </div>
      </div>

      {sentMsg && <p className="mb-2 text-sm font-medium text-emerald-600">✓ {sentMsg}</p>}
      {error && <p className="mb-2 text-sm text-red-600">{error}</p>}

      <div className="rounded-xl border border-slate-200 bg-slate-50 dark:bg-slate-900/40 p-4">
        <ItineraryReport data={data} />
      </div>
    </div>
  );
}
