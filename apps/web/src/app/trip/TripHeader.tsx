'use client';

import type { Trip } from '@/lib/traveler';
import { absoluteUploadUrl } from '@/lib/upload';

/**
 * Hero header for the trip.
 *
 * The itinerary already carries a cover photo — the same one the client report
 * leads with — and the app was ignoring it in favour of a title on white. For
 * something a traveller opens on the morning of a holiday, showing them where
 * they're going does more work than any amount of chrome.
 */

function formatRange(start: string | null, end: string | null): string | null {
  if (!start) return null;
  const from = new Date(start);
  const to = end ? new Date(end) : null;
  const day = (d: Date) => d.getDate();
  const monthYear = (d: Date) => d.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });

  if (!to) return `${day(from)} ${monthYear(from)}`;
  // Same month reads better collapsed: "10–15 Nov 2026", not "10 Nov – 15 Nov".
  if (from.getMonth() === to.getMonth() && from.getFullYear() === to.getFullYear()) {
    return `${day(from)}–${day(to)} ${monthYear(to)}`;
  }
  return `${day(from)} ${from.toLocaleDateString('en-IN', { month: 'short' })} – ${day(to)} ${monthYear(to)}`;
}

export function TripHeader({ trip, onSignOut }: { trip: Trip; onSignOut: () => void }) {
  const itinerary = trip.itinerary;
  const cover = itinerary?.coverPhotoUrl;
  const title = itinerary?.title ?? trip.booking.clientName;
  const destinations = itinerary?.destinations ?? [];
  const range = formatRange(itinerary?.startDate ?? null, itinerary?.endDate ?? null);

  const guests = itinerary
    ? [
        itinerary.adultsCount ? `${itinerary.adultsCount} adult${itinerary.adultsCount === 1 ? '' : 's'}` : null,
        itinerary.childrenCount ? `${itinerary.childrenCount} child${itinerary.childrenCount === 1 ? '' : 'ren'}` : null,
      ]
        .filter(Boolean)
        .join(' · ')
    : '';

  return (
    <header className="relative isolate overflow-hidden">
      {cover ? (
        <img src={absoluteUploadUrl(cover)} alt="" className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-brand-700 to-brand-500" />
      )}
      {/* Weighted to the bottom so the title always has contrast regardless of
          what the photo happens to look like up there. */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/45 to-black/25" />

      <div className="relative flex min-h-[13rem] flex-col justify-between p-4">
        <div className="flex items-start justify-between gap-3">
          {destinations.length > 0 && (
            <span className="rounded-full bg-white/20 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-white backdrop-blur-sm">
              {destinations.join(' · ')}
            </span>
          )}
          <button onClick={onSignOut} className="shrink-0 text-xs text-white/70 underline">
            Sign out
          </button>
        </div>

        <div>
          {/* No greeting here: the day's welcome card greets by name a few
              lines below, and saying hello twice on one screen reads like a
              form letter. */}
          <h1 className="text-2xl font-extrabold leading-tight tracking-tight text-white drop-shadow-sm">
            {title}
          </h1>
          {(range || guests) && (
            <p className="mt-1.5 text-sm text-white/80">{[range, guests].filter(Boolean).join('  ·  ')}</p>
          )}
        </div>
      </div>
    </header>
  );
}
