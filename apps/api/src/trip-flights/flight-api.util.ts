import { FlightStatusCode } from '@prisma/client';

/**
 * Live flight data from aviationstack (or any API that speaks its shape),
 * keyed entirely on env vars so the integration is dormant until the key is
 * purchased — every code path that would use it already runs today with
 * staff-entered data, and the API fills exactly the same columns.
 *
 *   FLIGHT_API_KEY   — access key (integration is off without it)
 *   FLIGHT_API_BASE  — optional override, defaults to aviationstack v1
 *
 * Only the fields we trust the feed on are returned. `note` stays staff-owned:
 * an automated feed should update facts, not speak to the customer.
 */

const DEFAULT_BASE = 'https://api.aviationstack.com/v1';

export interface LiveFlightStatus {
  status?: FlightStatusCode;
  revisedDeparture?: Date;
  terminal?: string;
  gate?: string;
  baggageBelt?: string;
}

export function isFlightApiConfigured(): boolean {
  return Boolean(process.env.FLIGHT_API_KEY);
}

interface AviationstackFlight {
  flight_status?: string;
  departure?: {
    scheduled?: string;
    estimated?: string;
    delay?: number | null;
    terminal?: string | null;
    gate?: string | null;
  };
  arrival?: { baggage?: string | null };
}

function mapStatus(raw: string | undefined, delayMinutes: number | null | undefined): FlightStatusCode | undefined {
  switch (raw) {
    case 'scheduled':
      return delayMinutes && delayMinutes > 0 ? 'DELAYED' : 'ON_TIME';
    case 'active':
      return 'DEPARTED';
    case 'landed':
      return 'LANDED';
    case 'cancelled':
      return 'CANCELLED';
    default:
      // incident/diverted/unknown: don't guess a status the enum can't say —
      // leave whatever staff last set and let the other fields update.
      return undefined;
  }
}

/**
 * Fetches the current status for one flight. Returns null when the API is not
 * configured, unreachable, or has no row for the flight — callers treat null
 * as "nothing to apply", never as an error the traveller should see.
 */
export async function fetchLiveFlightStatus(
  flightNumber: string,
  scheduledDeparture: Date | null,
): Promise<LiveFlightStatus | null> {
  if (!isFlightApiConfigured()) return null;

  const base = process.env.FLIGHT_API_BASE ?? DEFAULT_BASE;
  const params = new URLSearchParams({
    access_key: process.env.FLIGHT_API_KEY!,
    // aviationstack wants the IATA designator without spaces: "TG 318" → "TG318".
    flight_iata: flightNumber.replace(/\s+/g, ''),
  });
  if (scheduledDeparture) params.set('flight_date', scheduledDeparture.toISOString().slice(0, 10));

  try {
    const res = await fetch(`${base}/flights?${params}`);
    if (!res.ok) return null;
    const json = (await res.json()) as { data?: AviationstackFlight[] };
    const row = json.data?.[0];
    if (!row) return null;

    const status = mapStatus(row.flight_status, row.departure?.delay);
    const out: LiveFlightStatus = {};
    if (status) out.status = status;
    // A revised time is only meaningful when the flight actually slipped —
    // estimated === scheduled is the API confirming the plan, not changing it.
    if (
      row.departure?.estimated &&
      row.departure?.delay &&
      row.departure.delay > 0 &&
      row.departure.estimated !== row.departure.scheduled
    ) {
      const revised = new Date(row.departure.estimated);
      if (!Number.isNaN(revised.getTime())) out.revisedDeparture = revised;
    }
    if (row.departure?.terminal) out.terminal = row.departure.terminal;
    if (row.departure?.gate) out.gate = row.departure.gate;
    if (row.arrival?.baggage) out.baggageBelt = row.arrival.baggage;

    return Object.keys(out).length ? out : null;
  } catch {
    // The poll runs on a schedule; a transient API failure just means the next
    // run tries again. Never let it take the job down.
    return null;
  }
}
