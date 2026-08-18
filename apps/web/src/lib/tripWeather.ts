'use client';

import { useEffect, useState } from 'react';

/**
 * Destination weather for the trip, from Open-Meteo (free, no API key, no
 * attribution requirement).
 *
 * Three tiers, because one number would be a lie in two of the three cases:
 *
 *  - Within the forecast horizon (~16 days) we show the real forecast for that
 *    day.
 *  - Beyond it — a trip booked months ahead — no forecast exists, so we show
 *    what those same calendar dates actually did last year and label it as
 *    typical rather than predicted.
 *  - Offline or the service is down: the last cached answer, and if there
 *    isn't one, nothing at all. The day's greeting simply omits the weather
 *    rather than inventing it.
 *
 * Everything is cached in localStorage so a traveller already abroad still
 * sees the numbers they synced with, and so switching between days doesn't
 * re-hit the network.
 */

const CACHE_PREFIX = 'hv_trip_weather:';
const CACHE_TTL_MS = 3 * 60 * 60 * 1000;
/**
 * Bump whenever the cached shape changes meaning. v2 added weather_code —
 * without this, a device that had opened the app before that change kept
 * serving code-less entries for hours: no icon on the day strip, and a
 * greeting that called a rainy day "perfect beach weather" because the mood
 * fell back to temperature alone. A TTL doesn't help there; the entry isn't
 * stale, it's the wrong shape.
 */
const CACHE_VERSION = 2;
/** Open-Meteo serves roughly 16 days ahead; stay a day inside that. */
const FORECAST_HORIZON_DAYS = 15;
/** Past years averaged when no forecast exists yet — see mergeTypical. */
const TYPICAL_YEARS_SAMPLED = 3;

export type WeatherKind = 'forecast' | 'typical';

export interface DayWeather {
  maxC: number;
  minC: number;
  code: number | null;
  kind: WeatherKind;
}

export interface TripWeather {
  /** Shape marker; entries written by an older build are discarded on read. */
  version: number;
  destination: string;
  byDate: Record<string, DayWeather>;
  current: { tempC: number; code: number } | null;
  fetchedAt: string;
}

/** WMO weather codes → a phrase a person would actually say. */
export function describeWeather(code: number | null): string | null {
  if (code == null) return null;
  if (code === 0) return 'clear and sunny';
  if (code <= 2) return 'mostly sunny';
  if (code === 3) return 'overcast';
  if (code <= 48) return 'foggy';
  if (code <= 57) return 'drizzly';
  if (code <= 67) return 'rainy';
  if (code <= 77) return 'snowy';
  if (code <= 82) return 'showery';
  if (code <= 86) return 'snowy';
  return 'stormy';
}

function isoDay(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function addDays(d: Date, n: number): Date {
  return new Date(d.getTime() + n * 86_400_000);
}

async function geocode(destination: string): Promise<{ lat: number; lon: number } | null> {
  const res = await fetch(
    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(destination)}&count=1&format=json`,
  );
  if (!res.ok) return null;
  const json = await res.json();
  const hit = json.results?.[0];
  return hit ? { lat: hit.latitude, lon: hit.longitude } : null;
}

function collectDaily(
  daily: { time: string[]; temperature_2m_max: number[]; temperature_2m_min: number[]; weather_code?: number[] },
  kind: WeatherKind,
  shiftYears = 0,
): Record<string, DayWeather> {
  const out: Record<string, DayWeather> = {};
  daily.time.forEach((date, i) => {
    // Historical rows come back stamped with last year's date; shift them onto
    // the trip's own dates so the lookup key matches the day being shown.
    const key = shiftYears
      ? `${Number(date.slice(0, 4)) + shiftYears}${date.slice(4)}`
      : date;
    out[key] = {
      maxC: daily.temperature_2m_max[i],
      minC: daily.temperature_2m_min[i],
      code: daily.weather_code?.[i] ?? null,
      kind,
    };
  });
  return out;
}

/** One past year's actuals for the trip's dates, keyed by the trip's own dates. */
async function fetchArchive(
  point: { lat: number; lon: number },
  from: string,
  to: string,
  yearsAgo: number,
): Promise<Record<string, DayWeather> | null> {
  const shiftBack = (d: string) => `${Number(d.slice(0, 4)) - yearsAgo}${d.slice(4)}`;
  const res = await fetch(
    `https://archive-api.open-meteo.com/v1/archive?latitude=${point.lat}&longitude=${point.lon}` +
      `&start_date=${shiftBack(from)}&end_date=${shiftBack(to)}` +
      `&daily=temperature_2m_max,temperature_2m_min,weather_code&timezone=auto`,
  );
  if (!res.ok) return null;
  const json = await res.json();
  return json.daily ? collectDaily(json.daily, 'typical', yearsAgo) : null;
}

/** Mean temperature and the most frequently observed sky, per date. */
function mergeTypical(samples: Record<string, DayWeather>[]): Record<string, DayWeather> {
  const merged: Record<string, DayWeather> = {};
  const dates = new Set(samples.flatMap((s) => Object.keys(s)));

  for (const date of dates) {
    const rows = samples.map((s) => s[date]).filter(Boolean);
    if (rows.length === 0) continue;

    const counts = new Map<number, number>();
    for (const row of rows) {
      if (row.code == null) continue;
      counts.set(row.code, (counts.get(row.code) ?? 0) + 1);
    }
    const modal = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

    merged[date] = {
      maxC: rows.reduce((sum, r) => sum + r.maxC, 0) / rows.length,
      minC: rows.reduce((sum, r) => sum + r.minC, 0) / rows.length,
      code: modal,
      kind: 'typical',
    };
  }
  return merged;
}

async function loadWeather(destination: string, dates: string[]): Promise<TripWeather | null> {
  const point = await geocode(destination);
  if (!point) return null;

  const base = `https://api.open-meteo.com/v1/forecast?latitude=${point.lat}&longitude=${point.lon}&timezone=auto`;
  const byDate: Record<string, DayWeather> = {};

  const today = new Date();
  const horizon = addDays(today, FORECAST_HORIZON_DAYS);
  const sorted = [...dates].sort();
  const first = sorted[0];
  const last = sorted[sorted.length - 1];

  // Whatever part of the trip falls inside the forecast horizon gets a real
  // forecast; the rest falls through to last year's actuals below.
  const forecastFrom = first < isoDay(today) ? isoDay(today) : first;
  const forecastTo = last > isoDay(horizon) ? isoDay(horizon) : last;
  if (forecastFrom <= forecastTo) {
    const res = await fetch(
      `${base}&daily=temperature_2m_max,temperature_2m_min,weather_code&start_date=${forecastFrom}&end_date=${forecastTo}`,
    );
    if (res.ok) {
      const json = await res.json();
      if (json.daily) Object.assign(byDate, collectDaily(json.daily, 'forecast'));
    }
  }

  const uncovered = sorted.filter((d) => !byDate[d]);
  if (uncovered.length > 0) {
    // Sampled across several past years rather than just last year. A single
    // year is a coin toss on whether it happened to rain, and labelling that
    // "typical" would have travellers packing for one day's weather from a
    // year ago. Averaging the temperatures and taking the most common sky is
    // a claim the word actually supports.
    const samples = await Promise.all(
      Array.from({ length: TYPICAL_YEARS_SAMPLED }, (_, i) => i + 1).map((shift) =>
        fetchArchive(point, uncovered[0], uncovered[uncovered.length - 1], shift),
      ),
    );
    Object.assign(byDate, mergeTypical(samples.filter(Boolean) as Record<string, DayWeather>[]));
  }

  let current: TripWeather['current'] = null;
  const currentRes = await fetch(`${base}&current=temperature_2m,weather_code`);
  if (currentRes.ok) {
    const json = await currentRes.json();
    if (json.current) {
      current = { tempC: json.current.temperature_2m, code: json.current.weather_code };
    }
  }

  return { version: CACHE_VERSION, destination, byDate, current, fetchedAt: new Date().toISOString() };
}

function readCache(destination: string): TripWeather | null {
  try {
    const raw = window.localStorage.getItem(CACHE_PREFIX + destination);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as TripWeather;
    // An entry from an older build is not stale, it's the wrong shape — drop
    // it outright rather than letting the TTL keep serving it.
    return parsed.version === CACHE_VERSION ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * Weather for every city the trip visits, keyed by destination.
 *
 * Keyed rather than single because the day strip shows all six days at once,
 * and a Phuket day must report Phuket even while a Bangkok day is selected.
 * Fetching per destination (usually one to three) and caching each separately
 * keeps that correct without re-hitting the network as the traveller moves
 * between days.
 */
export function useTripWeather(
  destinations: (string | null)[],
  dates: string[],
): Record<string, TripWeather> {
  const [byDestination, setByDestination] = useState<Record<string, TripWeather>>({});
  // Both arrive as fresh arrays each render; key on content so the effect
  // doesn't re-fire, and re-fetch, on every parent re-render.
  const dateKey = dates.join(',');
  const destinationKey = [...new Set(destinations.filter((d): d is string => Boolean(d)))]
    .sort()
    .join(',');

  useEffect(() => {
    if (!destinationKey || !dateKey) {
      setByDestination({});
      return;
    }
    let cancelled = false;
    const wanted = destinationKey.split(',');
    const tripDates = dateKey.split(',');

    // Seed from cache first so an offline traveller sees their figures
    // immediately, then refresh whatever has gone stale.
    const seeded: Record<string, TripWeather> = {};
    for (const destination of wanted) {
      const cached = readCache(destination);
      if (cached) seeded[destination] = cached;
    }
    setByDestination(seeded);

    for (const destination of wanted) {
      const cached = seeded[destination];
      if (cached && Date.now() - new Date(cached.fetchedAt).getTime() < CACHE_TTL_MS) continue;

      loadWeather(destination, tripDates)
        .then((next) => {
          if (cancelled || !next) return;
          setByDestination((prev) => ({ ...prev, [destination]: next }));
          try {
            window.localStorage.setItem(CACHE_PREFIX + destination, JSON.stringify(next));
          } catch {
            // A full quota must not break the greeting.
          }
        })
        // Offline, blocked, or the service is down — whatever was cached stands.
        .catch(() => {});
    }

    return () => {
      cancelled = true;
    };
  }, [destinationKey, dateKey]);

  return byDestination;
}
