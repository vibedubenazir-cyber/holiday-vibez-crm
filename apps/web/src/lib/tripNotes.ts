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

const MIDDAY_OPENERS = [
  (n: string) => `Good morning${n}. Here's how today looks.`,
  (n: string) => `A new day${n} — everything's arranged, just show up.`,
  (n: string) => `Morning${n}. Today's plan is below.`,
];

const MIDDAY_CLOSERS = [
  (d: number) => `That's Day ${d} done. Rest well — tomorrow's ready when you are. 🌙`,
  (d: number) => `Day ${d} wrapped. Put your feet up, we've got the rest handled. ✨`,
  (d: number) => `That's Day ${d}. Sleep well — tomorrow's all set. 🌙`,
];

export function dayOpener(name: string | null | undefined, dayNumber: number, totalDays: number): string {
  const first = firstName(name);
  const suffix = first ? `, ${first}` : '';

  if (dayNumber === 1) {
    return `Your holiday starts today${suffix}. Everything below is taken care of — all you have to do is enjoy it. ✨`;
  }
  if (dayNumber === totalDays) {
    return `Last day${suffix}. Let's make it a good one.`;
  }
  return MIDDAY_OPENERS[dayNumber % MIDDAY_OPENERS.length](suffix);
}

export function dayCloser(name: string | null | undefined, dayNumber: number, totalDays: number): string {
  const first = firstName(name);
  const suffix = first ? `, ${first}` : '';

  if (dayNumber === totalDays) {
    return `And that's your trip${suffix}. Safe travels home — we'd love to have you back. ✈️`;
  }
  return MIDDAY_CLOSERS[dayNumber % MIDDAY_CLOSERS.length](dayNumber);
}
