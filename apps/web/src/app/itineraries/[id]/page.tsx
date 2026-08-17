'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { AppShell } from '@/components/AppShell';
import { api, ApiError } from '@/lib/api';
import type { ItineraryPlanDTO } from '@holiday-vibez/shared';
import { BuildTab } from './BuildTab';
import { PricingTab } from './PricingTab';
import { FinalTab } from './FinalTab';

type Tab = 'build' | 'pricing' | 'final';

export default function ItineraryBuilderPage() {
  const { id } = useParams<{ id: string }>();
  const [plan, setPlan] = useState<ItineraryPlanDTO | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('build');

  async function load() {
    try {
      setPlan(await api.get<ItineraryPlanDTO>(`/itineraries/${id}`));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load itinerary');
    }
  }

  useEffect(() => {
    if (id) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (error) {
    return (
      <AppShell>
        <p className="text-sm text-red-600">{error}</p>
      </AppShell>
    );
  }

  if (!plan) {
    return (
      <AppShell>
        <p className="text-sm text-slate-400">Loading…</p>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="border-b border-slate-200 dark:border-slate-700">
        <div className="flex gap-6 text-sm font-medium">
          {(['build', 'pricing', 'final'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`border-b-2 px-1 pb-3 pt-1 capitalize transition-colors ${
                tab === t ? 'border-brand text-brand' : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {tab === 'build' && <BuildTab plan={plan} onReload={load} />}
      {tab === 'pricing' && <PricingTab plan={plan} onReload={load} />}
      {tab === 'final' && <FinalTab plan={plan} onReload={load} />}
    </AppShell>
  );
}
