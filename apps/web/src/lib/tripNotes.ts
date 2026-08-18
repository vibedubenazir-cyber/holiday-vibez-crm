'use client';

/**
 * The warm voice of the traveller app.
 *
 * A trip app that only lists times and addresses reads like a logistics
 * printout. These lines open and close each day by name, so someone checking
 * their phone in an unfamiliar country feels looked after rather than
 * processed.
 *
 * Two constraints shaped this:
 *  - Deterministic, never random. The same day must read the same on every
 *    render, or the copy would flicker on re-render and differ between the
 *    server and the client on hydration.
 *  - Rotated, never repeated. The same sentence every morning for six days
 *    stops sounding personal by day two, so middle days cycle through a few.
 */

/** "Priya Sharma" → "Priya". Falls back gracefully for single-word names. */
export function firstName(full: string | null | undefined): string {
  return (full ?? '').trim().split(/\s+/)[0] ?? '';
}

export function greeting(name: string | null | undefined): string | null {
  const first = firstName(name);
  return first ? `Hi ${first} 👋` : null;
}

// These follow the "Hi <name>" line, so they are statements rather than
// greetings — two hellos in one card reads like a form letter.
const MIDDAY_OPENERS = [
  () => `Here's how today looks.`,
  () => `Everything's arranged — all you have to do is show up.`,
  () => `Today's plan is below, and it's all taken care of.`,
];

const MIDDAY_CLOSERS = [
  (d: number) => `That's Day ${d} done. Rest well — tomorrow's ready when you are. 🌙`,
  (d: number) => `Day ${d} wrapped. Put your feet up, we've got the rest handled. ✨`,
  (d: number) => `That's Day ${d}. Sleep well — tomorrow's all set. 🌙`,
];

export interface WeatherSentence {
  /** Split so the temperature can be emphasised without re-parsing prose. */
  prefix: string;
  temp: string;
  suffix: string;
  /**
   * Small print shown under the sentence when the figure is a seasonal
   * average rather than a forecast. The sentence itself stays warm and
   * readable; the caveat lives here so honesty doesn't cost the tone.
   */
  note?: string;
}

/** Turns the numbers into something encouraging, and useful for packing. */
function mood(maxC: number, code: number | null): string {
  const wet = code != null && ((code >= 51 && code <= 67) || (code >= 80 && code <= 99));
  if (wet) return 'carry a light umbrella and you’ll be all set';
  if (maxC >= 30) return 'perfect beach weather';
  if (maxC >= 25) return 'lovely for exploring';
  if (maxC >= 18) return 'beautiful walking weather';
  if (maxC >= 10) return 'crisp — a light jacket will do';
  return 'chilly, so do wrap up warm';
}

/**
 * The weather line inside the welcome.
 *
 * A forecast is stated plainly; a figure taken from last year's same dates is
 * always hedged as "usually" and never dressed up as a prediction, because a
 * traveller packs based on this and deserves to know which one they're reading.
 */
export function weatherSentence(
  destination: string | null | undefined,
  weather:
    | { maxC: number; minC: number; code: number | null; kind: 'forecast' | 'typical' }
    | null
    | undefined,
  day?: { date: string | null; isToday: boolean },
): WeatherSentence | null {
  if (!weather) return null;
  const where = destination ?? 'your destination';
  const temp = `${Math.round(weather.maxC)}°C`;
  const low = Math.round(weather.minC);
  const tail = mood(weather.maxC, weather.code);
  const sky = describeSky(weather.code);

  // "Today" only when it genuinely is; otherwise name the day, so browsing
  // ahead to Thursday never claims to describe this morning.
  const when =
    day?.isToday || !day?.date
      ? 'Today'
      : new Date(day.date).toLocaleDateString('en-IN', { weekday: 'long' });

  const estimate = weather.kind === 'typical';
  // Colon rather than a dash: the mood clause at the end already uses one,
  // and two em-dashes in a single sentence read as a stutter.
  const prefix = `${when} in ${where}: ${estimate ? 'around ' : ''}`;

  // Max plus overnight low describes the whole day rather than one moment.
  const arc = Number.isFinite(low) ? `, easing to ${low}°C overnight` : '';
  const suffix = `${sky ? ` and ${sky}` : ''}${arc} — ${tail}.`;

  return {
    prefix,
    temp,
    suffix,
    note: estimate ? 'Typical for this time of year — live forecast nearer the date.' : undefined,
  };
}

/**
 * Kept local so the notes module stays free of weather-API concerns. Each
 * phrase must read after an "and", so none of them may contain one of their
 * own — "33°C and clear and sunny" is the trap here.
 */
function describeSky(code: number | null): string | null {
  if (code == null) return null;
  if (code === 0) return 'sunny';
  if (code <= 2) return 'mostly sunny';
  if (code === 3) return 'overcast';
  if (code <= 48) return 'misty';
  if (code <= 57) return 'drizzly';
  if (code <= 67) return 'rainy';
  if (code <= 77) return 'snowy';
  if (code <= 82) return 'showery';
  if (code <= 86) return 'snowy';
  return 'stormy';
}

export function dayOpener(dayNumber: number, totalDays: number): string {
  if (dayNumber === 1) {
    return `Your holiday starts today. Everything below is taken care of — all you have to do is enjoy it. ✨`;
  }
  if (dayNumber === totalDays) {
    return `Last day — let's make it a good one.`;
  }
  return MIDDAY_OPENERS[dayNumber % MIDDAY_OPENERS.length]();
}

export function dayCloser(name: string | null | undefined, dayNumber: number, totalDays: number): string {
  const first = firstName(name);
  const suffix = first ? `, ${first}` : '';

  if (dayNumber === totalDays) {
    return `And that's your trip${suffix}. Safe travels home — we'd love to have you back. ✈️`;
  }
  return MIDDAY_CLOSERS[dayNumber % MIDDAY_CLOSERS.length](dayNumber);
}
