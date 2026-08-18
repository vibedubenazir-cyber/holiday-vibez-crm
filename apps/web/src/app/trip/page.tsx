'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  fetchTrip,
  getTripToken,
  readCachedTrip,
  signOutTraveler,
  type Trip,
} from '@/lib/traveler';
import { InstallPrompt } from './InstallPrompt';
import { TripSignIn } from './TripSignIn';
import { AlertsTab, EssentialsTab, HotelsTab, ItineraryTab, TransfersTab } from './TripTabs';

type TabId = 'itinerary' | 'alerts' | 'hotels' | 'transfers' | 'essentials';

// Alerts sits second: after "what am I doing today", the next question on any
// travel day is "when do I need to be somewhere".
const TABS: { id: TabId; label: string }[] = [
  { id: 'itinerary', label: 'Itinerary' },
  { id: 'alerts', label: 'Alerts' },
  { id: 'hotels', label: 'Hotels' },
  { id: 'transfers', label: 'Transfers' },
  { id: 'essentials', label: 'Essentials' },
];

export default function TripPage() {
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [trip, setTrip] = useState<Trip | null>(null);
  const [tab, setTab] = useState<TabId>('itinerary');
  const [offline, setOffline] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    // Paint the cached copy immediately, then try the network. A traveller
    // opening this on airport wifi that resolves DNS but goes nowhere should
    // still see their hotel address instantly rather than a spinner.
    const cached = readCachedTrip();
    if (cached) setTrip(cached);

    setRefreshing(true);
    try {
      setTrip(await fetchTrip());
      setOffline(false);
    } catch (err) {
      // 401 means the session is genuinely gone — fall back to sign-in.
      // Anything else (no signal, DNS failure, 5xx) keeps the cached trip.
      if ((err as { status?: number }).status === 401) {
        setSignedIn(false);
        setTrip(null);
        return;
      }
      setOffline(true);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const hasToken = Boolean(getTripToken());
    setSignedIn(hasToken);
    if (hasToken) void load();
  }, [load]);

  // Re-sync whenever connectivity comes back, so a traveller who walks into
  // hotel wifi gets fresh driver details without pulling to refresh.
  useEffect(() => {
    function onOnline() {
      if (getTripToken()) void load();
    }
    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
  }, [load]);

  if (signedIn === null) {
    return <div className="p-8 text-center text-sm text-slate-400">Loading…</div>;
  }

  if (!signedIn) {
    // The prompt shows here too: installing before signing in means the app is
    // already on the home screen by the time the trip data lands in it.
    return (
      <>
        <InstallPrompt />
        <TripSignIn
          onSignedIn={() => {
            setSignedIn(true);
            void load();
          }}
        />
      </>
    );
  }

  if (!trip) {
    return <div className="p-8 text-center text-sm text-slate-400">{refreshing ? 'Loading your trip…' : 'No trip found.'}</div>;
  }

  return (
    <div className="mx-auto max-w-lg pb-20">
      <InstallPrompt />
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-500">
              {trip.itinerary?.destinations.join(', ') || 'My trip'}
            </p>
            <h1 className="text-lg font-extrabold tracking-tight text-brand-700">
              {trip.itinerary?.title ?? trip.booking.clientName}
            </h1>
          </div>
          <button
            onClick={() => {
              signOutTraveler();
              setSignedIn(false);
              setTrip(null);
            }}
            className="shrink-0 text-xs text-slate-400 underline"
          >
            Sign out
          </button>
        </div>
        {offline && (
          <p className="mt-2 rounded-lg bg-amber-50 px-2 py-1 text-xs text-amber-800">
            Offline — showing your saved copy from {new Date(trip.syncedAt).toLocaleString('en-IN')}
          </p>
        )}
      </header>

      {/* Wraps to two rows rather than scrolling sideways: five labels don't
          fit across a 375px phone, and a tab you have to drag into view is a
          tab you don't know exists. Three then two, each row filling the
          width. */}
      <nav className="flex flex-wrap border-b border-slate-200 bg-white">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`grow basis-1/3 border-b-2 px-2 py-3 text-sm font-medium transition ${
              tab === t.id ? 'border-brand text-brand-700' : 'border-transparent text-slate-500'
            }`}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {tab === 'itinerary' && <ItineraryTab trip={trip} />}
      {tab === 'alerts' && <AlertsTab trip={trip} />}
      {tab === 'hotels' && <HotelsTab hotels={trip.hotels} />}
      {tab === 'transfers' && (
        <TransfersTab transfers={trip.transfers} timezone={trip.itinerary?.timezone ?? null} />
      )}
      {tab === 'essentials' && <EssentialsTab trip={trip} />}
    </div>
  );
}
