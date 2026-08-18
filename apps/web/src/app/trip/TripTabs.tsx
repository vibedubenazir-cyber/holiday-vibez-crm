'use client';

import { useEffect, useMemo, useState } from 'react';
import type { CountryGuide, Trip, TripHotel, TripTransfer } from '@/lib/traveler';
import { absoluteUploadUrl } from '@/lib/upload';
import { downloadTripIcs } from '@/lib/tripIcs';
import { dayCloser, dayOpener, weatherLead } from '@/lib/tripNotes';
import { useNotificationPermission, useTripReminders } from '@/lib/tripReminders';
import { useTripWeather } from '@/lib/tripWeather';
import {
  buildSchedule,
  formatRelative,
  formatRemindBefore,
  KIND_LABELS,
  toDate,
  type ScheduleItem,
} from '@/lib/tripSchedule';

function formatDate(value: string | null) {
  if (!value) return '';
  return new Date(value).toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
}

/**
 * Renders a stored instant on the destination's clock. A pickup arranged for
 * 07:45 in Bangkok has to read 07:45 whether the traveller checks it from
 * Mumbai the week before or from the arrivals hall.
 */
function formatDateTime(value: string | null, timeZone: string | null) {
  if (!value) return '';
  return new Date(value).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    ...(timeZone ? { timeZone } : {}),
  });
}

const TRANSFER_LABELS: Record<string, string> = {
  ARRIVAL_PICKUP: 'Airport pickup',
  DEPARTURE_DROP: 'Airport drop',
  INTERCITY: 'Intercity transfer',
  DAY_TRANSFER: 'Day transfer',
};

/**
 * Builds a wa.me target, or null when we can't be sure of the country.
 *
 * wa.me needs a full international number as bare digits. A number stored
 * without a country code can't be resolved to one country from here, and
 * guessing would open a chat with a stranger — so WhatsApp is simply not
 * offered for those, while the tel: link still works as before.
 */
function whatsappNumber(phone: string): string | null {
  const trimmed = phone.trim();
  const digits = trimmed.replace(/\D/g, '');
  if (!digits) return null;
  if (trimmed.startsWith('+')) return digits;
  if (digits.startsWith('00')) return digits.slice(2);
  return null;
}

function WhatsAppGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.16-.17.2-.35.22-.64.08-.3-.15-1.26-.47-2.4-1.48-.88-.79-1.48-1.76-1.65-2.06-.17-.3-.02-.46.13-.6.13-.14.3-.35.45-.52.15-.18.2-.3.3-.5.1-.2.05-.37-.03-.52-.07-.15-.67-1.61-.91-2.2-.25-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.8.37-.27.3-1.03 1.02-1.03 2.48 0 1.46 1.06 2.87 1.21 3.07.15.2 2.1 3.2 5.08 4.49.7.3 1.26.49 1.69.62.71.23 1.36.2 1.87.12.57-.09 1.76-.72 2-1.41.25-.7.25-1.29.18-1.42-.08-.12-.27-.2-.57-.35M12.05 21.8a9.87 9.87 0 01-5.03-1.38l-.36-.21-3.74.98 1-3.65-.24-.37a9.86 9.86 0 01-1.51-5.26c0-5.45 4.44-9.89 9.89-9.89a9.83 9.83 0 016.99 2.9 9.83 9.83 0 012.89 6.99c0 5.45-4.44 9.89-9.89 9.89M20.52 3.45A11.9 11.9 0 0012.05 0C5.46 0 .1 5.36.1 11.95c0 2.1.55 4.14 1.6 5.94L0 24l6.3-1.65a11.88 11.88 0 005.69 1.45c6.58 0 11.94-5.36 11.95-11.95a11.87 11.87 0 00-3.42-8.4" />
    </svg>
  );
}

/**
 * Phone numbers are the single most important thing in this app when something
 * goes wrong, so every one of them is a real tel: link — one tap to dial,
 * never something to copy out by hand. A WhatsApp glyph sits alongside it
 * because abroad, on a foreign SIM or hotel wifi, a message often gets through
 * when a call costs money or won't connect at all.
 */
function CallLink({ phone, label }: { phone: string; label?: string }) {
  const wa = whatsappNumber(phone);
  return (
    <span className="inline-flex items-center gap-1.5">
      <a href={`tel:${phone.replace(/\s/g, '')}`} className="font-semibold text-brand underline">
        {label ?? phone}
      </a>
      {wa && (
        <a
          href={`https://wa.me/${wa}`}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Message ${label ?? phone} on WhatsApp`}
          className="text-[#25D366]"
        >
          <WhatsAppGlyph className="h-4 w-4" />
        </a>
      )}
    </span>
  );
}

/** Index of the day matching today, or 0 when the trip isn't running yet. */
function todayIndex(days: { date: string | null }[]): number {
  const today = new Date().toISOString().slice(0, 10);
  const found = days.findIndex((day) => day.date?.slice(0, 10) === today);
  return found === -1 ? 0 : found;
}

/**
 * One day at a time, rather than the whole trip on a single scroll. On the
 * morning of day 3 a traveller wants day 3 — not to scroll past two days that
 * already happened — so the view opens on today's day when the trip is running.
 */
export function ItineraryTab({ trip }: { trip: Trip }) {
  const days = useMemo(() => trip.itinerary?.days ?? [], [trip.itinerary]);
  const travellerName = trip.traveler?.name ?? trip.booking.clientName;
  const [index, setIndex] = useState(0);

  const safeIndexForWeather = Math.min(index, Math.max(days.length - 1, 0));
  // The city this day is actually spent in, so a Phuket day reports Phuket
  // rather than the trip's first destination.
  const dayDestination =
    days[safeIndexForWeather]?.events.find((e) => e.destination)?.destination ??
    trip.itinerary?.destinations[0] ??
    null;
  const tripDates = useMemo(
    () => days.map((d) => d.date?.slice(0, 10)).filter((d): d is string => Boolean(d)),
    [days],
  );
  const weather = useTripWeather(dayDestination, tripDates);

  // Deferred to an effect so the server and client first paint agree: the
  // current date isn't available during SSR, and diverging would hydrate wrong.
  useEffect(() => {
    setIndex(todayIndex(days));
  }, [days]);

  if (!trip.itinerary || days.length === 0) {
    return <p className="p-4 text-sm text-slate-500">Your day-by-day plan will appear here once it&apos;s finalised.</p>;
  }

  const safeIndex = Math.min(index, days.length - 1);
  const day = days[safeIndex];
  const previous = safeIndex > 0 ? days[safeIndex - 1] : null;
  const next = safeIndex < days.length - 1 ? days[safeIndex + 1] : null;

  // Split so the temperature can be set large without re-parsing the sentence.
  const leadText = weatherLead(dayDestination, day.date ? weather?.byDate[day.date.slice(0, 10)] : null);
  const lead = leadText ? { temp: leadText.split(' ')[0], rest: leadText.split(' ').slice(1).join(' ') } : null;

  return (
    <div>
      {/* A calendar strip rather than bare numbered dots: the weekday and date
          are what a traveller actually navigates by ("the Thursday we fly to
          Phuket"), and carrying them here retires the separate day banner that
          repeated the same thing in a blue slab underneath. */}
      <div className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="no-scrollbar flex gap-2 overflow-x-auto px-4 py-3">
          {days.map((d, i) => {
            const active = i === safeIndex;
            const date = d.date ? new Date(d.date) : null;
            return (
              <button
                key={d.id}
                onClick={() => setIndex(i)}
                aria-current={active ? 'true' : undefined}
                className={`flex w-14 shrink-0 flex-col items-center rounded-xl py-2 transition ${
                  active
                    ? 'bg-brand text-white shadow-sm shadow-brand-500/30'
                    : 'bg-slate-50 text-slate-500 ring-1 ring-slate-200'
                }`}
              >
                <span className={`text-[10px] font-semibold uppercase ${active ? 'text-blue-100' : 'text-slate-400'}`}>
                  {date ? date.toLocaleDateString('en-IN', { weekday: 'short' }) : `Day`}
                </span>
                <span className="text-lg font-bold leading-tight">
                  {date ? date.getDate() : d.dayNumber}
                </span>
                <span className={`text-[10px] ${active ? 'text-blue-100' : 'text-slate-400'}`}>
                  Day {d.dayNumber}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="px-4 pt-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          Day {day.dayNumber} of {days.length}
          {day.date && ` · ${formatDate(day.date)}`}
        </p>
        {/* Opens the day with the temperature, then by name. A trip app that
            only lists times reads like a logistics printout; this is the
            difference between being processed and being looked after. The
            weather is omitted entirely when we couldn't fetch it — never
            faked — so the greeting still reads naturally offline. */}
        <div className="mt-2 rounded-2xl bg-brand-50 px-4 py-3">
          {lead && (
            <p className="flex items-baseline gap-2">
              <span className="text-2xl font-extrabold text-brand-700">{lead.temp}</span>
              <span className="text-sm font-medium text-brand-800">{lead.rest}</span>
            </p>
          )}
          <p className={`text-sm font-medium text-brand-800 ${lead ? 'mt-1' : ''}`}>
            {dayOpener(travellerName, day.dayNumber, days.length)}
          </p>
        </div>
      </div>

      <div className="space-y-3 px-4 pt-3">
        {day.events.map((event) => (
          <div
            key={event.id}
            className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200/70"
          >
            {event.photoUrl && (
              <div className="relative h-40 w-full">
                <img src={absoluteUploadUrl(event.photoUrl)} alt="" className="absolute inset-0 h-full w-full object-cover" />
                {/* The time rides on the photo so the card body opens with the
                    name — scanning a day is a list of what, not of when. */}
                {event.showTime && event.startTime && (
                  <span className="absolute left-3 top-3 rounded-full bg-black/55 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur-sm">
                    {event.startTime}
                    {event.endTime ? ` – ${event.endTime}` : ''}
                  </span>
                )}
              </div>
            )}
            <div className="p-4">
              <p className="font-bold text-slate-800">{event.name}</p>
              {event.showTime && (event.startTime || event.endTime) && !event.photoUrl && (
                <p className="text-xs font-medium text-brand-600">
                  {event.startTime}
                  {event.endTime ? ` – ${event.endTime}` : ''}
                </p>
              )}
              {event.description &&
                (event.details?.descriptionBullets ? (
                  <ul className="mt-1 list-disc space-y-0.5 pl-4 text-sm text-slate-600">
                    {event.description
                      .split('\n')
                      .map((l) => l.trim())
                      .filter(Boolean)
                      .map((line, i) => (
                        <li key={i}>{line}</li>
                      ))}
                  </ul>
                ) : (
                  <p className="mt-1 whitespace-pre-line text-sm text-slate-600">{event.description}</p>
                ))}
            </div>
          </div>
        ))}
        {day.events.length === 0 && (
          <p className="px-1 text-sm text-slate-400">
            Nothing scheduled — the day is yours.
          </p>
        )}
      </div>

      {/* And signs it off. On the last day this becomes the farewell rather
          than a "see you tomorrow" that would be plainly wrong. */}
      <div className="px-4 pt-4">
        <p className="rounded-2xl bg-gradient-to-br from-slate-800 to-slate-700 px-4 py-3 text-sm font-medium text-white">
          {dayCloser(travellerName, day.dayNumber, days.length)}
        </p>
      </div>

      {/* Both directions name the day they lead to, so the traveller knows
          where they're going before tapping. */}
      <div className="flex gap-2 px-4 pt-4">
        <button
          onClick={() => setIndex(safeIndex - 1)}
          disabled={!previous}
          className="flex-1 rounded-xl bg-white px-3 py-3 text-left text-sm shadow-sm ring-1 ring-slate-200/70 disabled:invisible"
        >
          <span className="block text-xs text-slate-400">← Previous</span>
          <span className="font-semibold text-slate-700">Day {previous?.dayNumber}</span>
        </button>
        <button
          onClick={() => setIndex(safeIndex + 1)}
          disabled={!next}
          className="flex-1 rounded-xl bg-white px-3 py-3 text-right text-sm shadow-sm ring-1 ring-slate-200/70 disabled:invisible"
        >
          <span className="block text-xs text-slate-400">Next →</span>
          <span className="font-semibold text-slate-700">Day {next?.dayNumber}</span>
        </button>
      </div>
    </div>
  );
}

/** Short form for the check-in/out columns: "Tue, 10 Nov". */
function shortDate(value: string | null) {
  if (!value) return '';
  return new Date(value).toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short' });
}

function Chip({ label, value }: { label: string; value: string }) {
  return (
    <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs text-slate-600">
      <span className="font-semibold text-slate-500">{label}</span> {value}
    </span>
  );
}

export function HotelsTab({ hotels }: { hotels: TripHotel[] }) {
  if (hotels.length === 0) {
    return <p className="p-4 text-sm text-slate-500">No hotels have been added to your trip yet.</p>;
  }
  return (
    <div className="space-y-3 p-4">
      {hotels.map((h) => (
        <div
          key={`${h.optionLabel}-${h.id}`}
          className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200/70"
        >
          {h.photoUrl && (
            <div className="relative h-44 w-full">
              <img src={absoluteUploadUrl(h.photoUrl)} alt="" className="absolute inset-0 h-full w-full object-cover" />
              {h.destination && (
                <span className="absolute left-3 top-3 rounded-full bg-black/55 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur-sm">
                  {h.destination}
                </span>
              )}
            </div>
          )}
          <div className="p-4">
            <p className="text-lg font-bold leading-tight text-slate-800">{h.name}</p>
            {h.destination && !h.photoUrl && <p className="text-xs text-slate-500">{h.destination}</p>}

            {/* Split like a boarding pass: the two dates a traveller checks
                are read against each other, not down a list of labels. */}
            {(h.checkIn || h.checkOut) && (
              <div className="mt-3 flex divide-x divide-slate-200 rounded-xl bg-slate-50 text-center">
                <div className="flex-1 px-3 py-2.5">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Check-in</p>
                  <p className="text-sm font-semibold text-slate-800">{shortDate(h.checkIn)}</p>
                  {h.checkInTime && <p className="text-xs text-brand-600">{h.checkInTime}</p>}
                </div>
                <div className="flex-1 px-3 py-2.5">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Check-out</p>
                  <p className="text-sm font-semibold text-slate-800">{shortDate(h.checkOut)}</p>
                  {h.checkOutTime && <p className="text-xs text-brand-600">{h.checkOutTime}</p>}
                </div>
              </div>
            )}

            {(typeof h.details?.roomName === 'string' || typeof h.details?.mealPlan === 'string') && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {typeof h.details?.roomName === 'string' && <Chip label="Room" value={h.details.roomName} />}
                {typeof h.details?.mealPlan === 'string' && <Chip label="Meals" value={h.details.mealPlan} />}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

export function TransfersTab({ transfers, timezone }: { transfers: TripTransfer[]; timezone: string | null }) {
  if (transfers.length === 0) {
    return (
      <p className="p-4 text-sm text-slate-500">
        Your driver and pickup details will appear here closer to departure.
      </p>
    );
  }
  return (
    <div className="space-y-3 p-4">
      {transfers.map((t) => (
        <div key={t.id} className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200/70">
          <div className="p-4">
            <div className="flex items-start justify-between gap-2">
              <p className="font-bold text-slate-800">{TRANSFER_LABELS[t.type] ?? t.type}</p>
              {t.scheduledAt && (
                <span className="shrink-0 rounded-full bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-700">
                  {formatDateTime(t.scheduledAt, timezone)}
                </span>
              )}
            </div>
            {(t.fromLocation || t.toLocation) && (
              <p className="mt-1.5 text-sm text-slate-600">
                {t.fromLocation}
                {t.fromLocation && t.toLocation ? ' → ' : ''}
                {t.toLocation}
              </p>
            )}
          </div>

          {/* The driver block is tinted and sits apart, because at an airport
              this is the only part of the card anyone reads. */}
          {(t.driverName || t.driverPhone || t.vehicleType || t.vehicleNumber) && (
            <div className="border-t border-slate-100 bg-slate-50 px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Driver</p>
                  <p className="truncate font-semibold text-slate-800">{t.driverName ?? 'To be assigned'}</p>
                  {(t.vehicleType || t.vehicleNumber) && (
                    <p className="truncate text-xs text-slate-500">
                      {t.vehicleType} {t.vehicleNumber && `· ${t.vehicleNumber}`}
                    </p>
                  )}
                </div>
                {t.driverPhone && (
                  <div className="flex shrink-0 items-center gap-2">
                    <a
                      href={`tel:${t.driverPhone.replace(/\s/g, '')}`}
                      className="rounded-xl bg-gradient-to-br from-brand-600 to-brand-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-brand-500/25"
                    >
                      Call
                    </a>
                    {whatsappNumber(t.driverPhone) && (
                      <a
                        href={`https://wa.me/${whatsappNumber(t.driverPhone)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label="Message the driver on WhatsApp"
                        className="flex items-center gap-1.5 rounded-xl bg-[#25D366] px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm shadow-emerald-500/25"
                      >
                        <WhatsAppGlyph className="h-4 w-4" />
                      </a>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {t.notes && (
            <p className="border-t border-slate-100 px-4 py-3 text-sm text-slate-500">{t.notes}</p>
          )}
        </div>
      ))}
    </div>
  );
}

const KIND_STYLES: Record<string, string> = {
  FLIGHT: 'bg-sky-100 text-sky-700',
  CHECK_IN: 'bg-emerald-100 text-emerald-700',
  CHECK_OUT: 'bg-amber-100 text-amber-700',
  TRANSFER: 'bg-violet-100 text-violet-700',
};

function ScheduleRow({ entry, now }: { entry: ScheduleItem; now: Date | null }) {
  const at = toDate(entry);
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <div className="flex items-center justify-between gap-2">
        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${KIND_STYLES[entry.kind]}`}>
          {KIND_LABELS[entry.kind]}
        </span>
        {now && <span className="text-xs text-slate-400">{formatRelative(entry.instant, now)}</span>}
      </div>
      <p className="mt-1.5 font-medium text-slate-800">{entry.title}</p>
      {entry.location && <p className="text-xs text-slate-500">{entry.location}</p>}
      <p className="mt-1 text-sm text-slate-600">
        {at.toLocaleString('en-IN', {
          weekday: 'short',
          day: '2-digit',
          month: 'short',
          hour: '2-digit',
          minute: '2-digit',
        })}
      </p>
      <p className="mt-0.5 text-xs text-slate-400">⏰ Alarm {formatRemindBefore(entry.remindMinutesBefore)}</p>
    </div>
  );
}

/**
 * Leads with the single next thing, and keeps the rest of the trip folded
 * away until asked for. Showing every flight, check-in and transfer at once —
 * past ones included — turned the one question this tab exists to answer
 * ("what do I need to be ready for?") into a search task.
 */
export function AlertsTab({ trip }: { trip: Trip }) {
  const schedule = useMemo(() => buildSchedule(trip), [trip]);
  const [permission, requestPermission] = useNotificationPermission();
  const [added, setAdded] = useState(false);
  const [showAll, setShowAll] = useState(false);

  useTripReminders(schedule, permission === 'granted');

  // Held in state and ticked, rather than read during render: the server has
  // no clock to agree with, and the countdown would otherwise freeze at
  // whatever "now" was when the tab first mounted.
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const timer = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(timer);
  }, []);

  const tripTitle = trip.itinerary?.title ?? trip.booking.clientName;

  if (schedule.length === 0) {
    return (
      <p className="p-4 text-sm text-slate-500">
        Your flight, check-in and transfer times will appear here as they&apos;re confirmed.
      </p>
    );
  }

  // Before the clock is available, treat everything as upcoming rather than
  // flashing the wrong card.
  const upcoming = now ? schedule.filter((e) => e.instant.getTime() >= now.getTime()) : schedule;
  const next = upcoming[0];
  const later = upcoming.slice(1);
  const doneCount = schedule.length - upcoming.length;

  return (
    <div className="space-y-4 p-4">
      {next ? (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Next up</p>
          <div className="rounded-2xl border border-brand-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${KIND_STYLES[next.kind]}`}>
                {KIND_LABELS[next.kind]}
              </span>
              {now && (
                <span className="text-sm font-semibold text-brand-700">
                  {formatRelative(next.instant, now)}
                </span>
              )}
            </div>
            <p className="mt-2 text-lg font-bold leading-snug text-slate-800">{next.title}</p>
            {next.location && <p className="text-sm text-slate-500">{next.location}</p>}
            <p className="mt-2 text-sm font-medium text-slate-700">
              {toDate(next).toLocaleString('en-IN', {
                weekday: 'short',
                day: '2-digit',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
            <p className="mt-1 text-xs text-slate-400">⏰ Alarm {formatRemindBefore(next.remindMinutesBefore)}</p>
          </div>
        </div>
      ) : (
        <p className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-500">
          That&apos;s everything — no more scheduled times on this trip. Safe travels.
        </p>
      )}

      {/* Secondary to "next up", but still the thing that makes the alarms
          real, so it stays visible rather than hidden behind the fold. */}
      <button
        onClick={() => {
          downloadTripIcs(schedule, tripTitle);
          setAdded(true);
        }}
        className="w-full rounded-xl bg-gradient-to-br from-brand-600 to-brand-500 px-4 py-3 text-sm font-semibold text-white shadow-md shadow-brand-500/25"
      >
        {added ? '✓ Added — tap to add again' : `Add all ${schedule.length} alarms to my phone`}
      </button>
      <p className="-mt-2 px-1 text-xs text-slate-400">
        Your phone&apos;s own calendar will alarm you even with no internet and this app closed.
      </p>

      {later.length > 0 && (
        <div>
          <button
            onClick={() => setShowAll((v) => !v)}
            aria-expanded={showAll}
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-600"
          >
            {showAll ? 'Hide the rest' : `Then ${later.length} more`} {showAll ? '▲' : '▼'}
          </button>

          {showAll && (
            <div className="mt-3 space-y-2">
              {later.map((entry) => (
                <ScheduleRow key={entry.id} entry={entry} now={now} />
              ))}
            </div>
          )}
        </div>
      )}

      {doneCount > 0 && (
        <p className="px-1 text-center text-xs text-slate-400">{doneCount} already done</p>
      )}

      {permission !== 'granted' && permission !== 'unsupported' && (
        <button
          onClick={() => void requestPermission()}
          disabled={permission === 'denied'}
          className="w-full px-1 text-left text-xs text-slate-400 underline disabled:no-underline"
        >
          {permission === 'denied'
            ? 'In-app alerts are blocked in your browser settings'
            : 'Also alert me inside the app while it’s open'}
        </button>
      )}
    </div>
  );
}

/** A section heading inside a guide card, with a hairline above it. */
function GuideSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-t border-slate-100 px-4 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{title}</p>
      <div className="mt-1.5 space-y-1.5 text-sm text-slate-700">{children}</div>
    </div>
  );
}

/**
 * A whole-tile call target for the numbers dialled in a genuine emergency.
 * At that moment nobody is aiming carefully at an inline link, so police and
 * ambulance get thumb-sized tiles of their own.
 */
function EmergencyTile({ label, phone }: { label: string; phone: string }) {
  return (
    <a
      href={`tel:${phone.replace(/\s/g, '')}`}
      className="flex-1 rounded-xl bg-rose-50 px-3 py-2.5 text-center ring-1 ring-rose-100"
    >
      <span className="block text-[10px] font-semibold uppercase tracking-wide text-rose-400">{label}</span>
      <span className="block text-lg font-bold text-rose-700">{phone}</span>
    </a>
  );
}

export function EssentialsTab({ trip }: { trip: Trip }) {
  return (
    <div className="space-y-4 p-4">
      {/* The one number that reaches Holiday Vibez leads the tab and is a
          full-width button, not a link inside a sentence. */}
      <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-rose-600 to-rose-500 p-4 shadow-sm shadow-rose-500/25">
        <p className="text-sm font-bold text-white">24/7 Holiday Vibez support</p>
        <p className="mt-0.5 text-xs text-rose-100">Anywhere, any time — we pick up.</p>
        {trip.support.emergencyPhone ? (
          <div className="mt-3 flex gap-2">
            <a
              href={`tel:${trip.support.emergencyPhone.replace(/\s/g, '')}`}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-base font-bold text-rose-700"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4" aria-hidden="true">
                <path d="M22 16.9v3a2 2 0 01-2.2 2 19.8 19.8 0 01-8.6-3.1 19.5 19.5 0 01-6-6A19.8 19.8 0 012.1 4.2 2 2 0 014.1 2h3a2 2 0 012 1.7c.1.9.3 1.8.6 2.6a2 2 0 01-.5 2.1L8.1 9.9a16 16 0 006 6l1.5-1.2a2 2 0 012.1-.4c.8.3 1.7.5 2.6.6a2 2 0 011.7 2z" />
              </svg>
              {trip.support.emergencyPhone}
            </a>
            {whatsappNumber(trip.support.emergencyPhone) && (
              <a
                href={`https://wa.me/${whatsappNumber(trip.support.emergencyPhone)}`}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Message Holiday Vibez support on WhatsApp"
                className="flex shrink-0 items-center justify-center rounded-xl bg-[#25D366] px-4 text-white"
              >
                <WhatsAppGlyph className="h-5 w-5" />
              </a>
            )}
          </div>
        ) : (
          <p className="mt-3 text-sm text-rose-100">No support number configured</p>
        )}
        {trip.support.email && <p className="mt-2 text-center text-xs text-rose-100">{trip.support.email}</p>}
      </div>

      {trip.countryGuides.length === 0 && (
        <p className="text-sm text-slate-500">
          Local emergency numbers, cab services and restaurant suggestions for your destination will appear here.
        </p>
      )}

      {trip.countryGuides.map((g: CountryGuide) => (
        <div key={g.country} className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200/70">
          <p className="px-4 pt-4 text-lg font-bold text-slate-800">{g.country}</p>

          {(g.emergencyPolice || g.emergencyMedical) && (
            <div className="flex gap-2 px-4 pt-3">
              {g.emergencyPolice && <EmergencyTile label="Police" phone={g.emergencyPolice} />}
              {g.emergencyMedical && <EmergencyTile label="Ambulance" phone={g.emergencyMedical} />}
            </div>
          )}

          <div className="pt-3" />

          {g.embassyName && (
            <GuideSection title="Embassy">
              <p className="font-medium text-slate-800">{g.embassyName}</p>
              {g.embassyPhone && <CallLink phone={g.embassyPhone} />}
              {g.embassyAddress && <p className="text-xs text-slate-500">{g.embassyAddress}</p>}
            </GuideSection>
          )}

          {g.cabServices && g.cabServices.length > 0 && (
            <GuideSection title="Cabs">
              {g.cabServices.map((c, i) => (
                <div key={i}>
                  <span className="font-medium text-slate-800">{c.name}</span>
                  {c.phone && <> · <CallLink phone={c.phone} /></>}
                  {c.notes && <p className="text-xs text-slate-500">{c.notes}</p>}
                </div>
              ))}
            </GuideSection>
          )}

          {g.restaurants && g.restaurants.length > 0 && (
            <GuideSection title="Indian restaurants">
              {g.restaurants.map((r, i) => (
                <div key={i}>
                  <span className="font-medium text-slate-800">{r.name}</span>
                  {r.phone && <> · <CallLink phone={r.phone} /></>}
                  {r.address && <p className="text-xs text-slate-500">{r.address}</p>}
                </div>
              ))}
            </GuideSection>
          )}

          {/* Local knowledge — don't drink the tap water, red flags mean rip
              currents — is a warning, so it gets a warning's colour. */}
          {g.notes && (
            <p className="border-t border-slate-100 bg-amber-50 px-4 py-3 text-sm text-amber-900">{g.notes}</p>
          )}
        </div>
      ))}
    </div>
  );
}
