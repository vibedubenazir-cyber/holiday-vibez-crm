'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { AppShell } from '@/components/AppShell';
import { api, ApiError } from '@/lib/api';
import type { QuotationItemDTO, QuotationSummaryDTO, RateCardDTO } from '@holiday-vibez/shared';

interface QuotationDetail extends Omit<QuotationSummaryDTO, 'lead'> {
  items: QuotationItemDTO[];
  lead: { clientName: string; destination: string };
}

export default function QuotationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [quotation, setQuotation] = useState<QuotationDetail | null>(null);
  const [rateCards, setRateCards] = useState<RateCardDTO[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selectedRate, setSelectedRate] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [departureDate, setDepartureDate] = useState('');

  async function load() {
    try {
      const [q, rates] = await Promise.all([
        api.get<QuotationDetail>(`/quotations/${id}`),
        api.get<RateCardDTO[]>('/rates'),
      ]);
      setQuotation(q);
      setRateCards(rates.filter((r) => r.active));
      if (!selectedRate && rates.length) setSelectedRate(rates[0].id);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load quotation');
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function handleAddItem(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api.post(`/quotations/${id}/items`, { rateCardId: selectedRate, quantity });
      setQuantity(1);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to add item');
    }
  }

  async function handleRemoveItem(itemId: string) {
    try {
      await api.delete(`/quotations/${id}/items/${itemId}`);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to remove item');
    }
  }

  async function handleSubmit() {
    setError(null);
    try {
      await api.post(`/quotations/${id}/submit-for-approval`);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to submit for approval');
    }
  }

  async function handleCreateBooking(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api.post('/bookings', { quotationId: id, departureDate });
      router.push('/bookings');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to create booking');
    }
  }

  if (!quotation) {
    return (
      <AppShell>
        <p className="text-sm text-slate-500">{error ?? 'Loading...'}</p>
      </AppShell>
    );
  }

  const isDraft = quotation.status === 'DRAFT';
  const isSent = quotation.status === 'SENT';

  return (
    <AppShell>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-slate-800">{quotation.refNo}</h1>
          <p className="text-sm text-slate-500">{quotation.lead.clientName} · {quotation.lead.destination} · {quotation.status}</p>
        </div>
        <div className="flex gap-2">
          {isDraft && (
            <button onClick={handleSubmit} className="rounded-md bg-brand px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-dark">
              Submit for approval
            </button>
          )}
        </div>
      </div>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      {isSent && (
        <form onSubmit={handleCreateBooking} className="mt-4 flex flex-wrap items-end gap-3 rounded-lg border border-slate-200 bg-white p-4">
          <div>
            <label className="block text-xs text-slate-500">Departure date</label>
            <input
              required
              type="date"
              value={departureDate}
              onChange={(e) => setDepartureDate(e.target.value)}
              className="mt-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <button type="submit" className="rounded-md bg-brand px-3 py-2 text-sm font-medium text-white hover:bg-brand-dark">
            Convert to booking
          </button>
        </form>
      )}

      {isDraft && (
        <form onSubmit={handleAddItem} className="mt-4 flex flex-wrap items-end gap-3 rounded-lg border border-slate-200 bg-white p-4">
          <div className="flex-1 min-w-[220px]">
            <label className="block text-xs text-slate-500">Rate card</label>
            <select value={selectedRate} onChange={(e) => setSelectedRate(e.target.value)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm">
              {rateCards.map((r) => (
                <option key={r.id} value={r.id}>{r.type} · {r.name} ({r.destination}) — {r.currency} {Number(r.baseCost).toLocaleString('en-IN')}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-500">Qty</label>
            <input type="number" min={1} value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} className="mt-1 w-20 rounded-md border border-slate-300 px-3 py-2 text-sm" />
          </div>
          <button type="submit" className="rounded-md bg-brand px-3 py-2 text-sm font-medium text-white hover:bg-brand-dark">
            + Add to quotation
          </button>
        </form>
      )}

      <div className="mt-4 overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-2">Item</th>
              <th className="px-4 py-2">Unit amount</th>
              <th className="px-4 py-2">Qty</th>
              <th className="px-4 py-2">Line total</th>
              {isDraft && <th className="px-4 py-2"></th>}
            </tr>
          </thead>
          <tbody>
            {quotation.items.map((item) => (
              <tr key={item.id} className="border-t border-slate-100">
                <td className="px-4 py-2">{item.description}</td>
                <td className="px-4 py-2">₹{Number(item.snapshotAmount).toLocaleString('en-IN')}</td>
                <td className="px-4 py-2">{item.quantity}</td>
                <td className="px-4 py-2">₹{(Number(item.snapshotAmount) * item.quantity).toLocaleString('en-IN')}</td>
                {isDraft && (
                  <td className="px-4 py-2 text-right">
                    <button onClick={() => handleRemoveItem(item.id)} className="text-red-600 hover:underline">Remove</button>
                  </td>
                )}
              </tr>
            ))}
            {quotation.items.length === 0 && (
              <tr><td colSpan={isDraft ? 5 : 4} className="px-4 py-6 text-center text-slate-400">No items yet — add rate cards above.</td></tr>
            )}
          </tbody>
          <tfoot>
            <tr className="border-t border-slate-200 bg-slate-50 font-semibold">
              <td className="px-4 py-2" colSpan={3}>Total</td>
              <td className="px-4 py-2">₹{Number(quotation.totalAmount).toLocaleString('en-IN')}</td>
              {isDraft && <td></td>}
            </tr>
          </tfoot>
        </table>
      </div>
    </AppShell>
  );
}
