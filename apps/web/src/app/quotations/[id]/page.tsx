'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { AppShell } from '@/components/AppShell';
import { api, ApiError } from '@/lib/api';
import type {
  FlightSearchResultDTO,
  HotelSearchResultDTO,
  QuotationItemDTO,
  QuotationSummaryDTO,
  RateCardDTO,
  TransferSearchResultDTO,
} from '@holiday-vibez/shared';

interface QuotationDetail extends Omit<QuotationSummaryDTO, 'lead'> {
  items: QuotationItemDTO[];
  lead: { clientName: string; destination: string; phone: string; email: string | null };
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
  const [linkCopied, setLinkCopied] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const sendingRef = useRef(false);

  const [showHotelSearch, setShowHotelSearch] = useState(false);
  const [hotelForm, setHotelForm] = useState({ destination: '', checkIn: '', checkOut: '', guests: 2 });
  const [hotelResults, setHotelResults] = useState<HotelSearchResultDTO[]>([]);
  const [hotelMarkup, setHotelMarkup] = useState(15);

  const [showFlightSearch, setShowFlightSearch] = useState(false);
  const [flightForm, setFlightForm] = useState({ origin: '', destination: '', date: '', pax: 2 });
  const [flightResults, setFlightResults] = useState<FlightSearchResultDTO[]>([]);
  const [flightMarkup, setFlightMarkup] = useState(15);

  const [showTransferSearch, setShowTransferSearch] = useState(false);
  const [transferForm, setTransferForm] = useState({ pickup: '', drop: '', date: '', pax: 2 });
  const [transferResults, setTransferResults] = useState<TransferSearchResultDTO[]>([]);
  const [transferMarkup, setTransferMarkup] = useState(15);

  async function load() {
    try {
      const [q, rates] = await Promise.all([
        api.get<QuotationDetail>(`/quotations/${id}`),
        api.get<RateCardDTO[]>('/rates'),
      ]);
      setQuotation(q);
      setRateCards(rates.filter((r) => r.active));
      if (!selectedRate && rates.length) setSelectedRate(rates[0].id);
      setHotelForm((f) => (f.destination ? f : { ...f, destination: q.lead.destination }));
      setFlightForm((f) => (f.destination ? f : { ...f, destination: q.lead.destination }));
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

  async function handleSearchHotels(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const params = new URLSearchParams({
        destination: hotelForm.destination,
        checkIn: hotelForm.checkIn,
        checkOut: hotelForm.checkOut,
        guests: String(hotelForm.guests),
      });
      setHotelResults(await api.get<HotelSearchResultDTO[]>(`/travel-search/hotels?${params}`));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to search hotels');
    }
  }

  async function handleAddHotelRoom(hotel: HotelSearchResultDTO, room: HotelSearchResultDTO['rooms'][number]) {
    setError(null);
    try {
      await api.post('/travel-search/add-to-quotation', {
        quotationId: id,
        type: 'HOTEL',
        name: `${hotel.hotelName} - ${room.roomType} (${room.mealPlan}, ${hotel.nights}n)`,
        destination: hotel.destination,
        netRate: room.totalRate,
        markupPct: hotelMarkup,
      });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to add hotel room');
    }
  }

  async function handleSearchFlights(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const params = new URLSearchParams({
        origin: flightForm.origin,
        destination: flightForm.destination,
        date: flightForm.date,
        pax: String(flightForm.pax),
      });
      setFlightResults(await api.get<FlightSearchResultDTO[]>(`/travel-search/flights?${params}`));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to search flights');
    }
  }

  async function handleAddFlight(flight: FlightSearchResultDTO) {
    setError(null);
    try {
      await api.post('/travel-search/add-to-quotation', {
        quotationId: id,
        type: 'FLIGHT',
        name: `${flight.airline} ${flight.flightNumber} ${flight.origin}-${flight.destination} (${flight.fareClass})`,
        destination: flight.destination,
        netRate: flight.baseFare,
        markupPct: flightMarkup,
        quantity: flightForm.pax,
      });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to add flight');
    }
  }

  async function handleSearchTransfers(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const params = new URLSearchParams({
        pickup: transferForm.pickup,
        drop: transferForm.drop,
        date: transferForm.date,
        pax: String(transferForm.pax),
      });
      setTransferResults(await api.get<TransferSearchResultDTO[]>(`/travel-search/transfers?${params}`));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to search transfers');
    }
  }

  async function handleAddTransfer(transfer: TransferSearchResultDTO) {
    setError(null);
    try {
      await api.post('/travel-search/add-to-quotation', {
        quotationId: id,
        type: 'TRANSFER',
        name: `${transfer.vehicleType} transfer ${transfer.pickup} → ${transfer.drop}`,
        destination: transfer.drop,
        netRate: transfer.baseFare,
        markupPct: transferMarkup,
      });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to add transfer');
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

  function handleCopyClientLink() {
    navigator.clipboard.writeText(`${window.location.origin}/quote/${id}`);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  }

  async function handleSendToClient() {
    // Guard with a ref, not just the `sending` state: state updates commit
    // after a render, so a second click/tap arriving before that commit
    // would still see disabled=false and fire a duplicate customer-facing
    // WhatsApp/email send. The ref is set synchronously, closing that gap.
    if (sendingRef.current) return;
    if (!quotation) return;
    const confirmed = window.confirm(
      `Send quotation ${quotation.refNo} to ${quotation.lead.clientName}?\n\nWhatsApp: ${quotation.lead.phone}\nEmail: ${quotation.lead.email ?? '(none on file — WhatsApp only)'}\n\nDouble-check these are correct before sending.`,
    );
    if (!confirmed) return;
    sendingRef.current = true;
    setError(null);
    setSending(true);
    try {
      await api.post(`/quotations/${id}/send`, {});
      setSent(true);
      setTimeout(() => setSent(false), 3000);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to send quotation');
    } finally {
      sendingRef.current = false;
      setSending(false);
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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-brand-700">{quotation.refNo}</h1>
          <p className="text-sm text-slate-500">{quotation.lead.clientName} · {quotation.lead.destination} · {quotation.status}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a
            href={`/quotations/${id}/itinerary`}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:border-brand-200 hover:bg-white dark:hover:bg-slate-800 hover:text-brand"
          >
            Manage itinerary
          </a>
          {isSent && (
            <>
              <a
                href={`/quote/${id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:border-brand-200 hover:bg-white dark:hover:bg-slate-800 hover:text-brand"
              >
                View quotation
              </a>
              <button
                onClick={handleCopyClientLink}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:border-brand-200 hover:bg-white dark:hover:bg-slate-800 hover:text-brand"
              >
                {linkCopied ? 'Copied!' : 'Copy client link'}
              </button>
              <button
                onClick={handleSendToClient}
                disabled={sending}
                className="rounded-xl bg-gradient-to-br from-brand-600 to-brand-500 px-3 py-1.5 text-sm font-semibold text-white shadow-md shadow-brand-500/25 transition hover:opacity-90 disabled:opacity-60"
              >
                {sending ? 'Sending...' : sent ? 'Sent!' : 'Send to client (WhatsApp + Email)'}
              </button>
            </>
          )}
          {isDraft && (
            <button onClick={handleSubmit} className="rounded-xl bg-gradient-to-br from-brand-600 to-brand-500 px-3 py-1.5 text-sm font-semibold text-white shadow-md shadow-brand-500/25 transition hover:opacity-90">
              Submit for approval
            </button>
          )}
        </div>
      </div>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      {isSent && (
        <form onSubmit={handleCreateBooking} className="mt-4 flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white dark:bg-slate-800 shadow-card transition-shadow hover:shadow-card-hover p-4">
          <div>
            <label className="block text-xs text-slate-500">Departure date</label>
            <input
              required
              type="date"
              value={departureDate}
              onChange={(e) => setDepartureDate(e.target.value)}
              className="mt-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-100 transition-colors"
            />
          </div>
          <button type="submit" className="rounded-xl bg-gradient-to-br from-brand-600 to-brand-500 shadow-md shadow-brand-500/25 px-3 py-2 text-sm font-medium text-white hover:opacity-90">
            Convert to booking
          </button>
        </form>
      )}

      {isDraft && (
        <div className="mt-4 space-y-3">
          <div className="rounded-xl border border-slate-200 bg-white dark:bg-slate-800 shadow-card transition-shadow hover:shadow-card-hover p-4">
            <button onClick={() => setShowHotelSearch((s) => !s)} className="text-sm font-medium text-brand hover:underline">
              {showHotelSearch ? 'Hide hotel search' : '+ Search hotels (live)'}
            </button>
            {showHotelSearch && (
              <>
                <form onSubmit={handleSearchHotels} className="mt-3 flex flex-wrap items-end gap-3">
                  <div>
                    <label className="block text-xs text-slate-500">Destination</label>
                    <input required value={hotelForm.destination} onChange={(e) => setHotelForm({ ...hotelForm, destination: e.target.value })} className="mt-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-100 transition-colors" />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500">Check-in</label>
                    <input required type="date" value={hotelForm.checkIn} onChange={(e) => setHotelForm({ ...hotelForm, checkIn: e.target.value })} className="mt-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-100 transition-colors" />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500">Check-out</label>
                    <input required type="date" value={hotelForm.checkOut} onChange={(e) => setHotelForm({ ...hotelForm, checkOut: e.target.value })} className="mt-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-100 transition-colors" />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500">Guests</label>
                    <input type="number" min={1} value={hotelForm.guests} onChange={(e) => setHotelForm({ ...hotelForm, guests: Number(e.target.value) })} className="mt-1 w-20 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-100 transition-colors" />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500">Markup %</label>
                    <input type="number" min={0} value={hotelMarkup} onChange={(e) => setHotelMarkup(Number(e.target.value))} className="mt-1 w-20 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-100 transition-colors" />
                  </div>
                  <button type="submit" className="rounded-xl bg-gradient-to-br from-brand-600 to-brand-500 shadow-md shadow-brand-500/25 px-3 py-2 text-sm font-medium text-white hover:opacity-90">Search</button>
                </form>
                <div className="mt-3 space-y-3">
                  {hotelResults.map((hotel, hi) => (
                    <div key={hi} className="rounded-lg border border-slate-100 p-3">
                      <p className="text-sm font-medium text-slate-800">{hotel.hotelName} · {'★'.repeat(hotel.starRating)}</p>
                      <p className="text-xs text-slate-500">{hotel.address} · {hotel.nights} night(s)</p>
                      <div className="mt-2 overflow-x-auto"><table className="w-full text-xs">
                        <thead className="text-left text-slate-500"><tr><th className="py-1">Room</th><th>Meal</th><th>Nightly</th><th>Total (marked up)</th><th></th></tr></thead>
                        <tbody>
                          {hotel.rooms.map((room, ri) => (
                            <tr key={ri} className="border-t border-slate-100">
                              <td className="py-1">{room.roomType}</td>
                              <td>{room.mealPlan}</td>
                              <td>₹{room.nightlyRate.toLocaleString('en-IN')}</td>
                              <td>₹{Math.round(room.totalRate * (1 + hotelMarkup / 100)).toLocaleString('en-IN')}</td>
                              <td className="text-right"><button onClick={() => handleAddHotelRoom(hotel, room)} className="text-brand hover:underline">Add</button></td>
                            </tr>
                          ))}
                        </tbody>
                      </table></div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          <div className="rounded-xl border border-slate-200 bg-white dark:bg-slate-800 shadow-card transition-shadow hover:shadow-card-hover p-4">
            <button onClick={() => setShowFlightSearch((s) => !s)} className="text-sm font-medium text-brand hover:underline">
              {showFlightSearch ? 'Hide flight search' : '+ Search flights (live)'}
            </button>
            {showFlightSearch && (
              <>
                <form onSubmit={handleSearchFlights} className="mt-3 flex flex-wrap items-end gap-3">
                  <div>
                    <label className="block text-xs text-slate-500">Origin</label>
                    <input required value={flightForm.origin} onChange={(e) => setFlightForm({ ...flightForm, origin: e.target.value })} className="mt-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-100 transition-colors" />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500">Destination</label>
                    <input required value={flightForm.destination} onChange={(e) => setFlightForm({ ...flightForm, destination: e.target.value })} className="mt-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-100 transition-colors" />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500">Date</label>
                    <input required type="date" value={flightForm.date} onChange={(e) => setFlightForm({ ...flightForm, date: e.target.value })} className="mt-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-100 transition-colors" />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500">Pax</label>
                    <input type="number" min={1} value={flightForm.pax} onChange={(e) => setFlightForm({ ...flightForm, pax: Number(e.target.value) })} className="mt-1 w-20 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-100 transition-colors" />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500">Markup %</label>
                    <input type="number" min={0} value={flightMarkup} onChange={(e) => setFlightMarkup(Number(e.target.value))} className="mt-1 w-20 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-100 transition-colors" />
                  </div>
                  <button type="submit" className="rounded-xl bg-gradient-to-br from-brand-600 to-brand-500 shadow-md shadow-brand-500/25 px-3 py-2 text-sm font-medium text-white hover:opacity-90">Search</button>
                </form>
                <div className="mt-3 overflow-x-auto"><table className="w-full text-xs">
                  <thead className="text-left text-slate-500"><tr><th className="py-1">Airline</th><th>Flight</th><th>Depart</th><th>Arrive</th><th>Class</th><th>Fare (marked up, x{flightForm.pax} pax)</th><th></th></tr></thead>
                  <tbody>
                    {flightResults.map((flight, fi) => (
                      <tr key={fi} className="border-t border-slate-100">
                        <td className="py-1">{flight.airline}</td>
                        <td>{flight.flightNumber}</td>
                        <td>{flight.departureTime}</td>
                        <td>{flight.arrivalTime}</td>
                        <td>{flight.fareClass}</td>
                        <td>₹{Math.round(flight.baseFare * (1 + flightMarkup / 100) * flightForm.pax).toLocaleString('en-IN')}</td>
                        <td className="text-right"><button onClick={() => handleAddFlight(flight)} className="text-brand hover:underline">Add</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table></div>
              </>
            )}
          </div>

          <div className="rounded-xl border border-slate-200 bg-white dark:bg-slate-800 shadow-card transition-shadow hover:shadow-card-hover p-4">
            <button onClick={() => setShowTransferSearch((s) => !s)} className="text-sm font-medium text-brand hover:underline">
              {showTransferSearch ? 'Hide transfer search' : '+ Search transfers (live)'}
            </button>
            {showTransferSearch && (
              <>
                <form onSubmit={handleSearchTransfers} className="mt-3 flex flex-wrap items-end gap-3">
                  <div>
                    <label className="block text-xs text-slate-500">Pickup</label>
                    <input required value={transferForm.pickup} onChange={(e) => setTransferForm({ ...transferForm, pickup: e.target.value })} className="mt-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-100 transition-colors" />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500">Drop</label>
                    <input required value={transferForm.drop} onChange={(e) => setTransferForm({ ...transferForm, drop: e.target.value })} className="mt-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-100 transition-colors" />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500">Date</label>
                    <input required type="date" value={transferForm.date} onChange={(e) => setTransferForm({ ...transferForm, date: e.target.value })} className="mt-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-100 transition-colors" />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500">Pax</label>
                    <input type="number" min={1} value={transferForm.pax} onChange={(e) => setTransferForm({ ...transferForm, pax: Number(e.target.value) })} className="mt-1 w-20 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-100 transition-colors" />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500">Markup %</label>
                    <input type="number" min={0} value={transferMarkup} onChange={(e) => setTransferMarkup(Number(e.target.value))} className="mt-1 w-20 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-100 transition-colors" />
                  </div>
                  <button type="submit" className="rounded-xl bg-gradient-to-br from-brand-600 to-brand-500 shadow-md shadow-brand-500/25 px-3 py-2 text-sm font-medium text-white hover:opacity-90">Search</button>
                </form>
                <div className="mt-3 overflow-x-auto"><table className="w-full text-xs">
                  <thead className="text-left text-slate-500"><tr><th className="py-1">Vehicle</th><th>Capacity</th><th>Distance</th><th>Fare (marked up)</th><th></th></tr></thead>
                  <tbody>
                    {transferResults.map((transfer, ti) => (
                      <tr key={ti} className="border-t border-slate-100">
                        <td className="py-1">{transfer.vehicleType}</td>
                        <td>{transfer.capacity} pax</td>
                        <td>{transfer.distanceKm} km</td>
                        <td>₹{Math.round(transfer.baseFare * (1 + transferMarkup / 100)).toLocaleString('en-IN')}</td>
                        <td className="text-right"><button onClick={() => handleAddTransfer(transfer)} className="text-brand hover:underline">Add</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table></div>
              </>
            )}
          </div>
        </div>
      )}

      {isDraft && (
        <form onSubmit={handleAddItem} className="mt-4 flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white dark:bg-slate-800 shadow-card transition-shadow hover:shadow-card-hover p-4">
          <div className="flex-1 min-w-[220px]">
            <label className="block text-xs text-slate-500">Rate card</label>
            <select value={selectedRate} onChange={(e) => setSelectedRate(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-100 transition-colors">
              {rateCards.map((r) => (
                <option key={r.id} value={r.id}>{r.type} · {r.name} ({r.destination}) — {r.currency} {Number(r.baseCost).toLocaleString('en-IN')}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-500">Qty</label>
            <input type="number" min={1} value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} className="mt-1 w-20 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-100 transition-colors" />
          </div>
          <button type="submit" className="rounded-xl bg-gradient-to-br from-brand-600 to-brand-500 shadow-md shadow-brand-500/25 px-3 py-2 text-sm font-medium text-white hover:opacity-90">
            + Add to quotation
          </button>
        </form>
      )}

      <div className="mt-4 overflow-x-auto bg-white dark:bg-slate-800">
        <table className="w-full text-sm">
          <thead className="bg-brand-50/60 text-left text-xs font-semibold uppercase tracking-wide text-brand-700 dark:bg-slate-900/40 dark:text-brand-300">
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
