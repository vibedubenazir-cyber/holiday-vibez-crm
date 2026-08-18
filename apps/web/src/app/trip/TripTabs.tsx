'use client';

import { useEffect, useMemo, useState } from 'react';
import type { CountryGuide, Trip, TripHotel, TripTransfer } from '@/lib/traveler';
import { absoluteUploadUrl } from '@/lib/upload';
import { downloadTripIcs } from '@/lib/tripIcs';
import { useNotificationPermission, useTripReminders } from '@/lib/tripReminders';
import {
  buildSchedule,
  formatRemindBefore,
  KIND_LABELS,
  toDate,
  type ScheduleItem,
} from '@/lib/tripSchedule';

function formatDate(value: string | null) {
  if (!value) return '';
  return new Date(value).toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
}

function formatDateTime(value: string | null) {
  if (!value) return '';
  return new Date(value).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

const TRANSFER_LABELS: Record<string, string> = {
  ARRIVAL_PICKUP: 'Airport pickup',
  DEPARTURE_DROP: 'Airport drop',
  INTERCITY: 'Intercity transfer',
  DAY_TRANSFER: 'Day transfer',
};

// Phone numbers are the single most important thing in this app when something
// goes wrong, so every one of them is a real tel: link — one tap to dial,
// never something to copy out by hand.
function CallLink({ phone, label }: { phone: string; label?: string }) {
  return (
    <a href={`tel:${phone.replace(/\s/g, '')}`} className="font-semibold text-brand underline">
      {label ?? phone}
    </a>
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
  const [index, setIndex] = useState(0);

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

  return (
    <div className="p-4">
      {/* Numbered pills double as the position indicator and a jump target,
          so "where am I in the trip" and "take me to day 5" cost one glance. */}
      <div className="-mx-1 mb-3 flex gap-1.5 overflow-x-auto px-1 pb-1">
        {days.map((d, i) => (
          <button
            key={d.id}
            onClick={() => setIndex(i)}
            aria-current={i === safeIndex ? 'true' : undefined}
            className={`h-9 w-9 shrink-0 rounded-full text-sm font-semibold transition ${
              i === safeIndex
                ? 'bg-brand text-white shadow-sm'
                : 'bg-white text-slate-500 ring-1 ring-slate-200'
            }`}
          >
            {d.dayNumber}
          </button>
        ))}
      </div>

      <div className="rounded-lg bg-brand px-3 py-2 text-white">
        <p className="text-sm font-semibold">
          Day {day.dayNumber}
          <span className="font-normal text-blue-100"> of {days.length}</span>
        </p>
        {day.date && <p className="text-xs text-blue-100">{formatDate(day.date)}</p>}
      </div>

      <div className="mt-3 space-y-2">
        {day.events.map((event) => (
          <div key={event.id} className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            {event.photoUrl && (
              <div className="relative h-36 w-full">
                <img src={absoluteUploadUrl(event.photoUrl)} alt="" className="absolute inset-0 h-full w-full object-cover" />
              </div>
            )}
            <div className="p-3">
              <p className="font-semibold text-slate-800">{event.name}</p>
              {event.showTime && (event.startTime || event.endTime) && (
                <p className="text-xs text-slate-500">
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
        {day.events.length === 0 && <p className="px-1 text-sm text-slate-400">Free day.</p>}
      </div>

      {/* Both directions name the day they lead to, so the traveller knows
          where they're going before tapping. */}
      <div className="mt-4 flex gap-2">
        <button
          onClick={() => setIndex(safeIndex - 1)}
          disabled={!previous}
          className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-3 text-left text-sm disabled:invisible"
        >
          <span className="block text-xs text-slate-400">← Previous</span>
          <span className="font-medium text-slate-700">Day {previous?.dayNumber}</span>
        </button>
        <button
          onClick={() => setIndex(safeIndex + 1)}
          disabled={!next}
          className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-3 text-right text-sm disabled:invisible"
        >
          <span className="block text-xs text-slate-400">Next →</span>
          <span className="font-medium text-slate-700">Day {next?.dayNumber}</span>
        </button>
      </div>
    </div>
  );
}

export function HotelsTab({ hotels }: { hotels: TripHotel[] }) {
  if (hotels.length === 0) {
    return <p className="p-4 text-sm text-slate-500">No hotels have been added to your trip yet.</p>;
  }
  return (
    <div className="space-y-3 p-4">
      {hotels.map((h) => (
        <div key={`${h.optionLabel}-${h.id}`} className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          {h.photoUrl && (
            <div className="relative h-40 w-full">
              <img src={absoluteUploadUrl(h.photoUrl)} alt="" className="absolute inset-0 h-full w-full object-cover" />
            </div>
          )}
          <div className="p-3">
            <p className="font-semibold text-slate-800">{h.name}</p>
            {h.destination && <p className="text-xs text-slate-500">{h.destination}</p>}
            <div className="mt-2 space-y-0.5 text-sm text-slate-600">
              {h.checkIn && (
                <p>
                  <span className="font-semibold text-slate-700">Check-in:</span> {formatDate(h.checkIn)}
                  {h.checkInTime ? ` at ${h.checkInTime}` : ''}
                </p>
              )}
              {h.checkOut && (
                <p>
                  <span className="font-semibold text-slate-700">Check-out:</span> {formatDate(h.checkOut)}
                  {h.checkOutTime ? ` at ${h.checkOutTime}` : ''}
                </p>
              )}
              {typeof h.details?.roomName === 'string' && (
                <p>
                  <span className="font-semibold text-slate-700">Room:</span> {h.details.roomName}
                </p>
              )}
              {typeof h.details?.mealPlan === 'string' && (
                <p>
                  <span className="font-semibold text-slate-700">Meals:</span> {h.details.mealPlan}
                </p>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function TransfersTab({ transfers }: { transfers: TripTransfer[] }) {
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
        <div key={t.id} className="rounded-xl border border-slate-200 bg-white p-3">
          <div className="flex items-center justify-between">
            <p className="font-semibold text-slate-800">{TRANSFER_LABELS[t.type] ?? t.type}</p>
            {t.scheduledAt && <span className="text-xs text-slate-500">{formatDateTime(t.scheduledAt)}</span>}
          </div>
          {(t.fromLocation || t.toLocation) && (
            <p className="mt-1 text-sm text-slate-600">
              {t.fromLocation}
              {t.fromLocation && t.toLocation ? ' → ' : ''}
              {t.toLocation}
            </p>
          )}
          {(t.driverName || t.driverPhone) && (
            <p className="mt-2 text-sm text-slate-700">
              Driver: <span className="font-medium">{t.driverName ?? 'To be assigned'}</span>
              {t.driverPhone && <> · <CallLink phone={t.driverPhone} /></>}
            </p>
          )}
          {(t.vehicleType || t.vehicleNumber) && (
            <p className="text-sm text-slate-500">
              {t.vehicleType} {t.vehicleNumber && `· ${t.vehicleNumber}`}
            </p>
          )}
          {t.notes && <p className="mt-1 text-sm text-slate-500">{t.notes}</p>}
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

function ScheduleRow({ entry, past }: { entry: ScheduleItem; past: boolean }) {
  const at = toDate(entry);
  return (
    <div className={`rounded-xl border border-slate-200 bg-white p-3 ${past ? 'opacity-50' : ''}`}>
      <div className="flex items-center justify-between gap-2">
        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${KIND_STYLES[entry.kind]}`}>
          {KIND_LABELS[entry.kind]}
        </span>
        <span className="text-sm font-semibold text-slate-700">
          {at.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
      <p className="mt-1.5 font-medium text-slate-800">{entry.title}</p>
      {entry.location && <p className="text-xs text-slate-500">{entry.location}</p>}
      <p className="mt-1 text-xs text-slate-400">
        ⏰ Alarm {formatRemindBefore(entry.remindMinutesBefore)}
      </p>
    </div>
  );
}

export function AlertsTab({ trip }: { trip: Trip }) {
  const schedule = useMemo(() => buildSchedule(trip), [trip]);
  const [permission, requestPermission] = useNotificationPermission();
  const [added, setAdded] = useState(false);

  useTripReminders(schedule, permission === 'granted');

  const tripTitle = trip.itinerary?.title ?? trip.booking.clientName;
  const now = Date.now();

  // Grouped by calendar day so the list reads as an agenda rather than a
  // flat stream of timestamps.
  const byDay = useMemo(() => {
    const groups = new Map<string, ScheduleItem[]>();
    for (const entry of schedule) {
      const key = toDate(entry).toDateString();
      groups.set(key, [...(groups.get(key) ?? []), entry]);
    }
    return [...groups.entries()];
  }, [schedule]);

  if (schedule.length === 0) {
    return (
      <p className="p-4 text-sm text-slate-500">
        Your flight, check-in and transfer times will appear here as they&apos;re confirmed.
      </p>
    );
  }

  return (
    <div className="space-y-4 p-4">
      <div className="rounded-xl border border-brand-200 bg-brand-50 p-3">
        <p className="text-sm font-semibold text-brand-700">Alarms on your phone</p>
        <p className="mt-1 text-xs text-brand-900/70">
          Add these to your phone&apos;s calendar and it will alarm you 3 hours before every flight and
          hotel check-in — with no internet, even with this app closed.
        </p>
        <button
          onClick={() => {
            downloadTripIcs(schedule, tripTitle);
            setAdded(true);
          }}
          className="mt-2.5 w-full rounded-xl bg-gradient-to-br from-brand-600 to-brand-500 px-4 py-3 text-sm font-semibold text-white shadow-md shadow-brand-500/25"
        >
          {added ? 'Add to calendar again' : `Add ${schedule.length} reminders to my calendar`}
        </button>
      </div>

      {permission !== 'granted' && permission !== 'unsupported' && (
        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <p className="text-sm font-semibold text-slate-800">Alerts while the app is open</p>
          <p className="mt-1 text-xs text-slate-500">
            Optional extra. Your phone&apos;s calendar above is what reminds you when the app is closed.
          </p>
          <button
            onClick={() => void requestPermission()}
            disabled={permission === 'denied'}
            className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 disabled:opacity-50"
          >
            {permission === 'denied' ? 'Blocked in browser settings' : 'Turn on notifications'}
          </button>
        </div>
      )}

      {byDay.map(([label, entries]) => (
        <div key={label}>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
            {new Date(label).toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short' })}
          </p>
          <div className="space-y-2">
            {entries.map((entry) => (
              <ScheduleRow key={entry.id} entry={entry} past={toDate(entry).getTime() < now} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function EssentialsTab({ trip }: { trip: Trip }) {
  return (
    <div className="space-y-4 p-4">
      <div className="rounded-xl border border-rose-200 bg-rose-50 p-3">
        <p className="text-sm font-semibold text-rose-800">24/7 Holiday Vibez support</p>
        <p className="mt-1 text-sm text-rose-900">
          {trip.support.emergencyPhone ? (
            <CallLink phone={trip.support.emergencyPhone} />
          ) : (
            <span className="text-rose-700">No support number configured</span>
          )}
        </p>
        {trip.support.email && <p className="text-xs text-rose-700">{trip.support.email}</p>}
      </div>

      {trip.countryGuides.length === 0 && (
        <p className="text-sm text-slate-500">
          Local emergency numbers, cab services and restaurant suggestions for your destination will appear here.
        </p>
      )}

      {trip.countryGuides.map((g: CountryGuide) => (
        <div key={g.country} className="rounded-xl border border-slate-200 bg-white p-3">
          <p className="font-semibold text-slate-800">{g.country}</p>

          {(g.emergencyPolice || g.emergencyMedical) && (
            <div className="mt-2 text-sm text-slate-700">
              {g.emergencyPolice && (
                <p>
                  Police: <CallLink phone={g.emergencyPolice} />
                </p>
              )}
              {g.emergencyMedical && (
                <p>
                  Ambulance: <CallLink phone={g.emergencyMedical} />
                </p>
              )}
            </div>
          )}

          {g.embassyName && (
            <div className="mt-2 text-sm text-slate-700">
              <p className="font-medium">{g.embassyName}</p>
              {g.embassyPhone && <CallLink phone={g.embassyPhone} />}
              {g.embassyAddress && <p className="text-xs text-slate-500">{g.embassyAddress}</p>}
            </div>
          )}

          {g.cabServices && g.cabServices.length > 0 && (
            <div className="mt-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Cabs</p>
              <ul className="mt-1 space-y-1 text-sm text-slate-700">
                {g.cabServices.map((c, i) => (
                  <li key={i}>
                    {c.name}
                    {c.phone && <> · <CallLink phone={c.phone} /></>}
                    {c.notes && <span className="text-slate-500"> — {c.notes}</span>}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {g.restaurants && g.restaurants.length > 0 && (
            <div className="mt-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Indian restaurants</p>
              <ul className="mt-1 space-y-1 text-sm text-slate-700">
                {g.restaurants.map((r, i) => (
                  <li key={i}>
                    {r.name}
                    {r.phone && <> · <CallLink phone={r.phone} /></>}
                    {r.address && <span className="block text-xs text-slate-500">{r.address}</span>}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {g.notes && <p className="mt-2 text-sm text-slate-500">{g.notes}</p>}
        </div>
      ))}
    </div>
  );
}
