'use client';

import type { FlightStatusCode, TripFlight } from '@/lib/traveler';

/**
 * Flight status: delay, terminal, gate, belt.
 *
 * Sits at the top of Alerts because a gate change is the one piece of trip
 * information with a hard deadline — a traveller who reads it after the gate
 * closes has been failed by the app. Anything disrupted is coloured; a flight
 * running normally stays quiet so the colours keep their meaning.
 */

const STATUS: Record<FlightStatusCode, { label: string; tone: string; loud: boolean }> = {
  SCHEDULED: { label: 'Scheduled', tone: 'bg-slate-100 text-slate-600', loud: false },
  ON_TIME: { label: 'On time', tone: 'bg-emerald-100 text-emerald-700', loud: false },
  DELAYED: { label: 'Delayed', tone: 'bg-amber-100 text-amber-800', loud: true },
  BOARDING: { label: 'Boarding', tone: 'bg-sky-100 text-sky-700', loud: true },
  DEPARTED: { label: 'Departed', tone: 'bg-slate-100 text-slate-600', loud: false },
  LANDED: { label: 'Landed', tone: 'bg-slate-100 text-slate-600', loud: false },
  CANCELLED: { label: 'Cancelled', tone: 'bg-rose-100 text-rose-700', loud: true },
};

function clock(value: string | null, timeZone: string | null): string {
  if (!value) return '';
  return new Date(value).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    ...(timeZone ? { timeZone } : {}),
  });
}

/** A labelled box — the three things people scan an airport board for. */
function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex-1 rounded-xl bg-slate-50 px-3 py-2 text-center">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <p className="text-lg font-bold leading-tight text-slate-800">{value}</p>
    </div>
  );
}

export function FlightStatusCard({ flight, timezone }: { flight: TripFlight; timezone: string | null }) {
  const status = STATUS[flight.status];
  const moved = Boolean(flight.revisedDeparture);

  return (
    <div
      className={`overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ${
        status.loud ? 'ring-2 ring-amber-300' : 'ring-slate-200/70'
      }`}
    >
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-bold text-slate-800">{flight.flightNumber}</p>
            {(flight.fromAirport || flight.toAirport) && (
              <p className="truncate text-sm text-slate-500">
                {flight.fromAirport}
                {flight.fromAirport && flight.toAirport ? ' → ' : ''}
                {flight.toAirport}
              </p>
            )}
          </div>
          <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${status.tone}`}>
            {status.label}
          </span>
        </div>

        {/* When a time moves, the original stays visible struck through —
            a traveller comparing against their ticket needs to see both. */}
        {(flight.scheduledDeparture || flight.revisedDeparture) && (
          <p className="mt-2 text-sm">
            {moved && (
              <span className="text-slate-400 line-through">{clock(flight.scheduledDeparture, timezone)}</span>
            )}
            <span className={`font-semibold ${moved ? 'ml-2 text-amber-700' : 'text-slate-700'}`}>
              {clock(flight.revisedDeparture ?? flight.scheduledDeparture, timezone)}
            </span>
          </p>
        )}
      </div>

      {(flight.terminal || flight.gate || flight.baggageBelt) && (
        <div className="flex gap-2 border-t border-slate-100 px-4 py-3">
          {flight.terminal && <Fact label="Terminal" value={flight.terminal} />}
          {flight.gate && <Fact label="Gate" value={flight.gate} />}
          {flight.baggageBelt && <Fact label="Belt" value={flight.baggageBelt} />}
        </div>
      )}

      {flight.note && (
        <p className="border-t border-slate-100 bg-amber-50 px-4 py-3 text-sm text-amber-900">{flight.note}</p>
      )}
    </div>
  );
}
