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
/** Open-Meteo serves roughly 16 days ahead; stay a day inside that. */
const FORECAST_HORIZON_DAYS = 15;

export type WeatherKind = 'forecast' | 'typical';

export interface DayWeather {
  maxC: number;
  minC: number;
  code: number | null;
  kind: WeatherKind;
}

export interface TripWeather {
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
    const shift = 1;
    const lastYear = (d: string) => `${Number(d.slice(0, 4)) - shift}${d.slice(4)}`;
    const res = await fetch(
      `https://archive-api.open-meteo.com/v1/archive?latitude=${point.lat}&longitude=${point.lon}` +
        `&start_date=${lastYear(uncovered[0])}&end_date=${lastYear(uncovered[uncovered.length - 1])}` +
        `&daily=temperature_2m_max,temperature_2m_min&timezone=auto`,
    );
    if (res.ok) {
      const json = await res.json();
      if (json.daily) Object.assign(byDate, collectDaily(json.daily, 'typical', shift));
    }
  }

  let current: TripWeather['current'] = null;
  const currentRes = await fetch(`${base}&current=temperature_2m,weather_code`);
  if (currentRes.ok) {
    const json = await currentRes.json();
    if (json.current) {
      current = { tempC: json.current.temperature_2m, code: json.current.weather_code };
    }
  }

  return { destination, byDate, current, fetchedAt: new Date().toISOString() };
}

function readCache(destination: string): TripWeather | null {
  try {
    const raw = window.localStorage.getItem(CACHE_PREFIX + destination);
    return raw ? (JSON.parse(raw) as TripWeather) : null;
  } catch {
    return null;
  }
}

export function useTripWeather(destination: string | null, dates: string[]): TripWeather | null {
  const [weather, setWeather] = useState<TripWeather | null>(null);
  // Dates arrive as a fresh array each render; key on the content so the
  // effect doesn't re-fire (and re-fetch) on every parent re-render.
  const dateKey = dates.join(',');

  useEffect(() => {
    if (!destination || !dateKey) {
      setWeather(null);
      return;
    }
    let cancelled = false;

    // Set unconditionally, including to null. Leaving the previous city's
    // reading in place while a new one loads would print Bangkok's temperature
    // under Phuket's name — worse than showing nothing for a moment.
    const cached = readCache(destination);
    setWeather(cached);

    const fresh = cached && Date.now() - new Date(cached.fetchedAt).getTime() < CACHE_TTL_MS;
    if (fresh) return;

    loadWeather(destination, dateKey.split(','))
      .then((next) => {
        if (cancelled || !next) return;
        setWeather(next);
        try {
          window.localStorage.setItem(CACHE_PREFIX + destination, JSON.stringify(next));
        } catch {
          // A full quota must not break the greeting.
        }
      })
      // Offline, blocked, or the service is down — whatever was cached stands.
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [destination, dateKey]);

  // Belt and braces: a late-arriving response for a city the traveller has
  // already navigated away from must never be attributed to the current one.
  return weather && weather.destination === destination ? weather : null;
}
