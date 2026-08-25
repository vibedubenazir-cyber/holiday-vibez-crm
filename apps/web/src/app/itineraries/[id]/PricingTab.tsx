'use client';

import { useEffect, useState } from 'react';
import { api, ApiError, getAccessToken } from '@/lib/api';
import { ItineraryEventType, type ItineraryPlanDTO, type ItineraryPricingOptionTotalsDTO } from '@holiday-vibez/shared';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';

function currency(n: number) {
  return `${n.toLocaleString('en-IN', { maximumFractionDigits: 2 })} INR`;
}

// Options are colour-coded so the accommodation that belongs to each one is
// identifiable at a glance in the line-item table — the reference report uses
// blue for Option 1 and orange for Option 3. Keyed by position so a given
// option keeps its colour across reloads.
const OPTION_COLOURS = [
  { tab: 'bg-brand text-white', badge: 'bg-brand-100 text-brand-700', dot: 'bg-brand' },
  { tab: 'bg-emerald-600 text-white', badge: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-600' },
  { tab: 'bg-orange-500 text-white', badge: 'bg-orange-100 text-orange-700', dot: 'bg-orange-500' },
  { tab: 'bg-purple-600 text-white', badge: 'bg-purple-100 text-purple-700', dot: 'bg-purple-600' },
];
const optionColour = (index: number) => OPTION_COLOURS[index % OPTION_COLOURS.length];

// Option labels carry the hotel names ("Option 1 — Chatrium + Katathani"),
// which is right for the tab but wraps a table cell to six lines. The badge
// only needs the identifying prefix, as the reference report shows.
function shortOptionLabel(label: string): string {
  const head = label.split(/\s+[—–-]\s+/)[0].trim();
  return head.length >= 3 && head.length <= 24 ? head : label.slice(0, 24);
}

export function PricingTab({ plan, onReload }: { plan: ItineraryPlanDTO; onReload: () => void }) {
  const [options, setOptions] = useState<ItineraryPricingOptionTotalsDTO[]>([]);
  const [activeOptionId, setActiveOptionId] = useState<string | null>(plan.pricingOptions[0]?.id ?? null);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  async function loadSummary() {
    try {
      const summary = await api.get<{ refNo: string; options: ItineraryPricingOptionTotalsDTO[] }>(`/itineraries/${plan.id}/pricing-summary`);
      setOptions(summary.options);
      if (!activeOptionId && summary.options[0]) setActiveOptionId(summary.options[0].optionId);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load pricing summary');
    }
  }

  useEffect(() => {
    loadSummary();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan]);

  const activeIndex = Math.max(0, plan.pricingOptions.findIndex((o) => o.id === activeOptionId));
  const activeStructOption = plan.pricingOptions.find((o) => o.id === activeOptionId);
  const activeTotals = options.find((o) => o.optionId === activeOptionId);

  const accommodationEvents = plan.days.flatMap((d) => d.events).filter((e) => e.type === ItineraryEventType.ACCOMMODATION);

  async function handleAddOption() {
    try {
      await api.post(`/itineraries/${plan.id}/pricing-options`, {});
      onReload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to add option');
    }
  }

  async function handleRenameOption(id: string, label: string) {
    try {
      await api.patch(`/itineraries/${plan.id}/pricing-options/${id}`, { label });
      onReload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to rename option');
    }
  }

  async function handleRemoveOption(id: string) {
    if (!confirm('Remove this pricing option?')) return;
    try {
      await api.delete(`/itineraries/${plan.id}/pricing-options/${id}`);
      setActiveOptionId(null);
      onReload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to remove option');
    }
  }

  async function handleToggleAccommodation(optionId: string, eventId: string, checked: boolean) {
    const current = plan.pricingOptions.find((o) => o.id === optionId)?.accommodations.map((a) => a.id) ?? [];
    const next = checked ? [...current, eventId] : current.filter((id) => id !== eventId);
    try {
      await api.patch(`/itineraries/${plan.id}/pricing-options/${optionId}`, { accommodationEventIds: next });
      onReload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to update accommodation selection');
    }
  }

  async function handleUpdateEventPricing(eventId: string, dayId: string, netAmount: string, markupPct: string) {
    try {
      await api.patch(`/itineraries/${plan.id}/days/${dayId}/events/${eventId}`, {
        netAmount: netAmount === '' ? undefined : Number(netAmount),
        markupPct: markupPct === '' ? undefined : Number(markupPct),
      });
      onReload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to update pricing');
    }
  }

  async function handleUpdateOptionTotals(id: string, fields: Record<string, number>) {
    try {
      await api.patch(`/itineraries/${plan.id}/pricing-options/${id}`, fields);
      onReload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to update option');
    }
  }

  async function handleExport() {
    setExporting(true);
    try {
      const token = getAccessToken();
      const res = await fetch(`${API_BASE}/itineraries/${plan.id}/pricing-summary/export.xlsx`, {
        credentials: 'include',
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `itinerary-${plan.refNo}-pricing.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setError('Failed to export pricing');
    } finally {
      setExporting(false);
    }
  }

  const [optionForm, setOptionForm] = useState<Record<string, string>>({});
  useEffect(() => {
    if (activeStructOption) {
      setOptionForm({
        baseMarkupPct: String(activeStructOption.baseMarkupPct),
        extraMarkupAmount: String(activeStructOption.extraMarkupAmount),
        cgstPct: String(activeStructOption.cgstPct),
        sgstPct: String(activeStructOption.sgstPct),
        igstPct: String(activeStructOption.igstPct),
        tcsPct: String(activeStructOption.tcsPct),
        discountAmount: String(activeStructOption.discountAmount),
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeOptionId, plan]);

  return (
    <div className="mt-4">
      {error && <p className="mb-2 text-sm text-red-600">{error}</p>}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-2">
          {plan.pricingOptions.map((o, idx) => (
            <button
              key={o.id}
              onClick={() => setActiveOptionId(o.id)}
              className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium ${
                activeOptionId === o.id ? optionColour(idx).tab : 'border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {activeOptionId !== o.id && <span className={`h-2 w-2 rounded-full ${optionColour(idx).dot}`} />}
              {o.label}
            </button>
          ))}
          <button onClick={handleAddOption} className="rounded-lg border border-dashed border-slate-300 px-3 py-1.5 text-sm text-slate-500 hover:border-brand hover:text-brand">
            + Option
          </button>
        </div>
        <button onClick={handleExport} disabled={exporting} className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60">
          {exporting ? 'Exporting…' : 'Export'}
        </button>
      </div>

      {activeStructOption && activeTotals && (
        <div className="mt-4">
          <div className="mb-3 flex items-center gap-3">
            {/* Keyed by option id so switching tabs remounts the field — an
                uncontrolled defaultValue otherwise keeps showing the previous
                option's label, and blurring it would rename the wrong option. */}
            <input
              key={activeStructOption.id}
              defaultValue={activeStructOption.label}
              onBlur={(e) => e.target.value !== activeStructOption.label && handleRenameOption(activeStructOption.id, e.target.value)}
              className="rounded-lg border border-slate-300 px-2 py-1 text-sm font-medium"
            />
            {plan.pricingOptions.length > 1 && (
              <button onClick={() => handleRemoveOption(activeStructOption.id)} className="text-xs text-red-500 hover:underline">
                Remove option
              </button>
            )}
          </div>

          <div className="mb-3 rounded-lg border border-slate-200 bg-slate-50 dark:bg-slate-900/40 p-3">
            <p className="mb-2 text-xs font-semibold uppercase text-slate-400">Accommodation for this option</p>
            <div className="flex flex-wrap gap-3">
              {accommodationEvents.map((e) => (
                <label key={e.id} className="flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={activeStructOption.accommodations.some((a) => a.id === e.id)}
                    onChange={(ev) => handleToggleAccommodation(activeStructOption.id, e.id, ev.target.checked)}
                  />
                  {e.name}
                </label>
              ))}
              {accommodationEvents.length === 0 && <p className="text-xs text-slate-400">No accommodation events added yet — add one in the Build tab.</p>}
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white dark:bg-slate-800">
            <table className="w-full text-sm">
              <thead className="bg-brand-50/60 text-left text-xs font-semibold uppercase tracking-wide text-brand-700 dark:bg-slate-900/40 dark:text-brand-300">
                <tr>
                  <th className="px-4 py-2">Item</th>
                  <th className="px-4 py-2">Option</th>
                  <th className="px-4 py-2">Type</th>
                  <th className="px-4 py-2">Net</th>
                  <th className="px-4 py-2">Markup %</th>
                  <th className="px-4 py-2">Gross</th>
                </tr>
              </thead>
              <tbody>
                {activeTotals.lineItems.map((li) => {
                  const event = plan.days.flatMap((d) => d.events).find((e) => e.id === li.eventId);
                  const day = plan.days.find((d) => d.events.some((e) => e.id === li.eventId));
                  return (
                    <tr key={li.eventId} className="border-t border-slate-100 dark:border-slate-700">
                      <td className="px-4 py-2 text-slate-700 dark:text-slate-200">{li.name}</td>
                      <td className="px-4 py-2">
                        {/* Only the accommodation is option-specific; every
                            other line is shared across options, shown as "–"
                            exactly as the reference report does. */}
                        {li.type === ItineraryEventType.ACCOMMODATION ? (
                          <span
                            title={activeStructOption.label}
                            className={`whitespace-nowrap rounded px-2 py-0.5 text-xs font-medium ${optionColour(activeIndex).badge}`}
                          >
                            {shortOptionLabel(activeStructOption.label)}
                          </span>
                        ) : (
                          <span className="text-slate-400">–</span>
                        )}
                      </td>
                      <td className="px-4 py-2 text-slate-500">{li.type}</td>
                      <td className="px-4 py-2">
                        <input
                          type="number"
                          defaultValue={li.net}
                          onBlur={(e) => day && event && handleUpdateEventPricing(event.id, day.id, e.target.value, String(li.markupPct))}
                          className="w-24 rounded border border-slate-200 px-2 py-1 text-xs"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="number"
                          defaultValue={li.markupPct}
                          onBlur={(e) => day && event && handleUpdateEventPricing(event.id, day.id, String(li.net), e.target.value)}
                          className="w-20 rounded border border-slate-200 px-2 py-1 text-xs"
                        />
                      </td>
                      <td className="px-4 py-2 font-medium text-slate-700 dark:text-slate-200">{currency(li.gross)}</td>
                    </tr>
                  );
                })}
                {activeTotals.lineItems.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-6 text-center text-slate-400">
                      No priced items yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-white dark:bg-slate-800 p-4">
              <p className="mb-2 text-xs font-semibold uppercase text-slate-400">Markup & Tax</p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {(
                  [
                    ['baseMarkupPct', 'Base Markup %'],
                    ['extraMarkupAmount', 'Extra Markup (INR)'],
                    ['cgstPct', 'CGST %'],
                    ['sgstPct', 'SGST %'],
                    ['igstPct', 'IGST %'],
                    ['tcsPct', 'TCS %'],
                    ['discountAmount', 'Discount (INR)'],
                  ] as const
                ).map(([key, label]) => (
                  <label key={key} className="text-xs text-slate-500">
                    {label}
                    <input
                      type="number"
                      value={optionForm[key] ?? ''}
                      onChange={(e) => setOptionForm({ ...optionForm, [key]: e.target.value })}
                      className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1 text-sm"
                    />
                  </label>
                ))}
              </div>
              <button
                onClick={() =>
                  handleUpdateOptionTotals(activeStructOption.id, {
                    baseMarkupPct: Number(optionForm.baseMarkupPct) || 0,
                    extraMarkupAmount: Number(optionForm.extraMarkupAmount) || 0,
                    cgstPct: Number(optionForm.cgstPct) || 0,
                    sgstPct: Number(optionForm.sgstPct) || 0,
                    igstPct: Number(optionForm.igstPct) || 0,
                    tcsPct: Number(optionForm.tcsPct) || 0,
                    discountAmount: Number(optionForm.discountAmount) || 0,
                  })
                }
                className="mt-3 rounded-xl bg-gradient-to-br from-brand-600 to-brand-500 shadow-md shadow-brand-500/25 px-3 py-1.5 text-sm font-medium text-white hover:opacity-90"
              >
                Update
              </button>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white dark:bg-slate-800 p-4">
              <p className="mb-2 text-xs font-semibold uppercase text-slate-400">Totals</p>
              <dl className="space-y-1 text-sm">
                <div className="flex justify-between"><dt className="text-slate-500">Subtotal</dt><dd>{currency(activeTotals.subtotalGross)}</dd></div>
                <div className="flex justify-between"><dt className="text-slate-500">Base Markup</dt><dd>{currency(activeTotals.baseMarkupAmount)}</dd></div>
                <div className="flex justify-between"><dt className="text-slate-500">Extra Markup</dt><dd>{currency(activeTotals.extraMarkupAmount)}</dd></div>
                <div className="flex justify-between"><dt className="text-slate-500">Discount</dt><dd>-{currency(activeTotals.discountAmount)}</dd></div>
                <div className="flex justify-between"><dt className="text-slate-500">CGST/SGST/IGST/TCS</dt><dd>{currency(activeTotals.cgstAmount + activeTotals.sgstAmount + activeTotals.igstAmount + activeTotals.tcsAmount)}</dd></div>
                <div className="flex justify-between border-t border-slate-100 pt-1 text-base font-semibold text-brand"><dt>Total Including GST</dt><dd>{currency(activeTotals.totalIncludingGst)}</dd></div>
              </dl>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
