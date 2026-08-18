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
import { TripHeader } from './TripHeader';
import { TripSignIn } from './TripSignIn';
import { TripTabBar, type TabId } from './TripTabBar';
import { AlertsTab, EssentialsTab, HotelsTab, ItineraryTab, TransfersTab } from './TripTabs';
import { DocumentsTab } from './DocumentsTab';

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
    // Bottom padding clears the fixed tab bar (and the home indicator below
    // it) so the last card of any tab is never trapped underneath.
    <div className="mx-auto max-w-lg pb-[calc(5.5rem+env(safe-area-inset-bottom))]">
      <InstallPrompt />
      <TripHeader
        trip={trip}
        onSignOut={() => {
          signOutTraveler();
          setSignedIn(false);
          setTrip(null);
        }}
      />
      {offline && (
        <p className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-800">
          Offline — showing your saved copy from {new Date(trip.syncedAt).toLocaleString('en-IN')}
        </p>
      )}

      {tab === 'itinerary' && <ItineraryTab trip={trip} />}
      {tab === 'alerts' && <AlertsTab trip={trip} />}
      {tab === 'hotels' && <HotelsTab hotels={trip.hotels} />}
      {tab === 'transfers' && (
        <TransfersTab transfers={trip.transfers} timezone={trip.itinerary?.timezone ?? null} />
      )}
      {tab === 'docs' && <DocumentsTab />}
      {tab === 'essentials' && <EssentialsTab trip={trip} />}

      <TripTabBar tab={tab} onChange={setTab} />
    </div>
  );
}
