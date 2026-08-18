'use client';

import type { CountryGuide, Trip, TripHotel, TripTransfer } from '@/lib/traveler';
import { absoluteUploadUrl } from '@/lib/upload';

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

export function ItineraryTab({ trip }: { trip: Trip }) {
  if (!trip.itinerary) {
    return <p className="p-4 text-sm text-slate-500">Your day-by-day plan will appear here once it&apos;s finalised.</p>;
  }
  return (
    <div className="space-y-4 p-4">
      {trip.itinerary.days.map((day) => (
        <div key={day.id}>
          <div className="rounded-lg bg-brand px-3 py-2 text-sm font-semibold text-white">
            Day {day.dayNumber}
            {day.date && ` — ${formatDate(day.date)}`}
          </div>
          <div className="mt-2 space-y-2">
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
        </div>
      ))}
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
