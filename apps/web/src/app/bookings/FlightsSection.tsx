'use client';

import { useEffect, useState } from 'react';
import { api, ApiError } from '@/lib/api';

/**
 * The staff side of the traveller app's flight status: everything a consultant
 * enters here — a delay, a gate, a terminal — lands on the traveller's phone
 * as a WhatsApp + email and appears in their app.
 *
 * Self-contained (fetches its own list, owns its forms) so the already-dense
 * bookings page only mounts one component per expanded booking.
 */

interface TripFlightDTO {
  id: string;
  flightNumber: string;
  fromAirport: string | null;
  toAirport: string | null;
  scheduledDeparture: string | null;
  revisedDeparture: string | null;
  status: string;
  terminal: string | null;
  gate: string | null;
  baggageBelt: string | null;
  note: string | null;
}

const STATUSES = ['SCHEDULED', 'ON_TIME', 'DELAYED', 'BOARDING', 'DEPARTED', 'LANDED', 'CANCELLED'];

const STATUS_TONES: Record<string, string> = {
  DELAYED: 'bg-amber-100 text-amber-800',
  CANCELLED: 'bg-rose-100 text-rose-700',
  BOARDING: 'bg-sky-100 text-sky-700',
  ON_TIME: 'bg-emerald-100 text-emerald-700',
};

const inputCls =
  'rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-100 transition-colors';

/** datetime-local wants "YYYY-MM-DDTHH:mm" in local time; the API wants ISO. */
function toLocalInput(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromLocalInput(value: string): string | undefined {
  return value ? new Date(value).toISOString() : undefined;
}

const EMPTY_ADD = { flightNumber: '', fromAirport: '', toAirport: '', scheduledDeparture: '', terminal: '', gate: '' };

type EditState = {
  status: string;
  revisedDeparture: string;
  terminal: string;
  gate: string;
  baggageBelt: string;
  note: string;
  notifyTraveller: boolean;
};

export function FlightsSection({ bookingId }: { bookingId: string }) {
  const [flights, setFlights] = useState<TripFlightDTO[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [addForm, setAddForm] = useState(EMPTY_ADD);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [edit, setEdit] = useState<EditState | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    try {
      setFlights(await api.get<TripFlightDTO[]>(`/bookings/${bookingId}/flights`));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load flights');
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookingId]);

  async function run(action: () => Promise<unknown>, fallback: string) {
    setBusy(true);
    setError(null);
    try {
      await action();
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : fallback);
    } finally {
      setBusy(false);
    }
  }

  function startEdit(f: TripFlightDTO) {
    setEditingId(f.id);
    setEdit({
      status: f.status,
      revisedDeparture: toLocalInput(f.revisedDeparture),
      terminal: f.terminal ?? '',
      gate: f.gate ?? '',
      baggageBelt: f.baggageBelt ?? '',
      note: f.note ?? '',
      notifyTraveller: false,
    });
  }

  return (
    <div className="mt-4">
      <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Flight status</h4>
      <p className="text-xs text-slate-500 dark:text-slate-400">
        Delays, gates and terminals entered here reach every traveller by WhatsApp + email, and update their trip app.
      </p>

      {error && <p className="mt-2 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}

      {flights === null ? (
        <p className="mt-2 text-sm text-slate-400">Loading…</p>
      ) : flights.length === 0 ? (
        <p className="mt-2 text-sm text-slate-400">No flights tracked yet — add the first one below.</p>
      ) : (
        <div className="mt-2 space-y-2">
          {flights.map((f) => (
            <div key={f.id} className="rounded-lg border border-slate-100 bg-slate-50/60 p-3 dark:border-slate-700 dark:bg-slate-900/30">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold text-slate-800 dark:text-slate-100">{f.flightNumber}</span>
                {(f.fromAirport || f.toAirport) && (
                  <span className="text-sm text-slate-500">
                    {f.fromAirport} → {f.toAirport}
                  </span>
                )}
                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_TONES[f.status] ?? 'bg-slate-200 text-slate-600'}`}>
                  {f.status.replace('_', ' ')}
                </span>
                {f.scheduledDeparture && (
                  <span className="text-xs text-slate-500">
                    dep {new Date(f.scheduledDeparture).toLocaleString()}
                    {f.revisedDeparture && (
                      <> → <span className="font-semibold text-amber-700">{new Date(f.revisedDeparture).toLocaleString()}</span></>
                    )}
                  </span>
                )}
                {f.terminal && <span className="text-xs text-slate-500">T{f.terminal}</span>}
                {f.gate && <span className="text-xs text-slate-500">Gate {f.gate}</span>}
                <span className="ml-auto flex gap-2">
                  <button
                    onClick={() =>
                      void run(() => api.post(`/trip-flights/${f.id}/refresh`, {}), 'Refresh failed')
                    }
                    disabled={busy}
                    title="Pull live status from the flight-data API (needs FLIGHT_API_KEY)"
                    className="text-xs text-brand hover:underline disabled:opacity-50"
                  >
                    Refresh live
                  </button>
                  <button onClick={() => (editingId === f.id ? setEditingId(null) : startEdit(f))} className="text-xs text-brand hover:underline">
                    {editingId === f.id ? 'Close' : 'Update'}
                  </button>
                  <button
                    onClick={() => void run(() => api.delete(`/trip-flights/${f.id}`), 'Delete failed')}
                    disabled={busy}
                    className="text-xs text-rose-600 hover:underline disabled:opacity-50"
                  >
                    Remove
                  </button>
                </span>
              </div>

              {editingId === f.id && edit && (
                <div className="mt-3 flex flex-wrap items-end gap-3 border-t border-slate-200 pt-3 dark:border-slate-700">
                  <label className="flex flex-col gap-1 text-xs font-medium text-slate-500">
                    Status
                    <select value={edit.status} onChange={(e) => setEdit({ ...edit, status: e.target.value })} className={inputCls}>
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>{s.replace('_', ' ')}</option>
                      ))}
                    </select>
                  </label>
                  <label className="flex flex-col gap-1 text-xs font-medium text-slate-500">
                    Revised departure
                    <input type="datetime-local" value={edit.revisedDeparture} onChange={(e) => setEdit({ ...edit, revisedDeparture: e.target.value })} className={inputCls} />
                  </label>
                  <label className="flex flex-col gap-1 text-xs font-medium text-slate-500">
                    Terminal
                    <input value={edit.terminal} onChange={(e) => setEdit({ ...edit, terminal: e.target.value })} className={`${inputCls} w-20`} />
                  </label>
                  <label className="flex flex-col gap-1 text-xs font-medium text-slate-500">
                    Gate
                    <input value={edit.gate} onChange={(e) => setEdit({ ...edit, gate: e.target.value })} className={`${inputCls} w-20`} />
                  </label>
                  <label className="flex flex-col gap-1 text-xs font-medium text-slate-500">
                    Baggage belt
                    <input value={edit.baggageBelt} onChange={(e) => setEdit({ ...edit, baggageBelt: e.target.value })} className={`${inputCls} w-24`} />
                  </label>
                  <label className="flex min-w-[16rem] flex-1 flex-col gap-1 text-xs font-medium text-slate-500">
                    Message to traveller (sent word-for-word)
                    <input value={edit.note} onChange={(e) => setEdit({ ...edit, note: e.target.value })} placeholder="e.g. Inbound aircraft delayed — new time confirmed" className={inputCls} />
                  </label>
                  <label className="flex items-center gap-1.5 pb-2 text-xs text-slate-500">
                    <input type="checkbox" checked={edit.notifyTraveller} onChange={(e) => setEdit({ ...edit, notifyTraveller: e.target.checked })} />
                    Notify even if nothing changed
                  </label>
                  <button
                    onClick={() =>
                      void run(
                        () =>
                          api.patch(`/trip-flights/${f.id}`, {
                            status: edit.status,
                            revisedDeparture: fromLocalInput(edit.revisedDeparture),
                            terminal: edit.terminal || undefined,
                            gate: edit.gate || undefined,
                            baggageBelt: edit.baggageBelt || undefined,
                            note: edit.note || undefined,
                            notifyTraveller: edit.notifyTraveller || undefined,
                          }),
                        'Update failed',
                      ).then(() => setEditingId(null))
                    }
                    disabled={busy}
                    className="rounded-xl bg-gradient-to-br from-brand-600 to-brand-500 px-4 py-2 text-sm font-medium text-white shadow-md shadow-brand-500/25 hover:opacity-90 disabled:opacity-50"
                  >
                    Save & notify
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-end gap-3 rounded-lg border border-slate-100 bg-slate-50/60 p-3 dark:border-slate-700 dark:bg-slate-900/30">
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-500">
          Flight no.
          <input value={addForm.flightNumber} onChange={(e) => setAddForm({ ...addForm, flightNumber: e.target.value })} placeholder="TG 318" className={`${inputCls} w-28`} />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-500">
          From
          <input value={addForm.fromAirport} onChange={(e) => setAddForm({ ...addForm, fromAirport: e.target.value })} placeholder="Mumbai (BOM)" className={`${inputCls} w-36`} />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-500">
          To
          <input value={addForm.toAirport} onChange={(e) => setAddForm({ ...addForm, toAirport: e.target.value })} placeholder="Bangkok (BKK)" className={`${inputCls} w-36`} />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-500">
          Scheduled departure
          <input type="datetime-local" value={addForm.scheduledDeparture} onChange={(e) => setAddForm({ ...addForm, scheduledDeparture: e.target.value })} className={inputCls} />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-500">
          Terminal
          <input value={addForm.terminal} onChange={(e) => setAddForm({ ...addForm, terminal: e.target.value })} className={`${inputCls} w-20`} />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-500">
          Gate
          <input value={addForm.gate} onChange={(e) => setAddForm({ ...addForm, gate: e.target.value })} className={`${inputCls} w-20`} />
        </label>
        <button
          onClick={() =>
            void run(
              () =>
                api.post(`/bookings/${bookingId}/flights`, {
                  flightNumber: addForm.flightNumber.trim(),
                  fromAirport: addForm.fromAirport || undefined,
                  toAirport: addForm.toAirport || undefined,
                  scheduledDeparture: fromLocalInput(addForm.scheduledDeparture),
                  terminal: addForm.terminal || undefined,
                  gate: addForm.gate || undefined,
                }),
              'Could not add flight',
            ).then(() => setAddForm(EMPTY_ADD))
          }
          disabled={busy || !addForm.flightNumber.trim()}
          className="rounded-xl bg-gradient-to-br from-brand-600 to-brand-500 px-4 py-2 text-sm font-medium text-white shadow-md shadow-brand-500/25 hover:opacity-90 disabled:opacity-50"
        >
          Add flight
        </button>
      </div>
    </div>
  );
}
