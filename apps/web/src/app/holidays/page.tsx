'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import type { PublicPackageDTO } from '@holiday-vibez/shared';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';

export default function PublicHolidaysPage() {
  const [packages, setPackages] = useState<PublicPackageDTO[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API_BASE}/public/packages`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load packages');
        return res.json();
      })
      .then(setPackages)
      .catch(() => setError('Could not load holiday packages right now.'));
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-brand-50/40 to-slate-50 dark:from-slate-950 dark:via-slate-950 dark:to-slate-950">
      <header className="border-b border-slate-200 bg-white/80 px-6 py-5 backdrop-blur dark:border-slate-800 dark:bg-slate-900/80">
        <Image src="/logo.png" alt="Holiday Vibez" width={160} height={40} className="h-auto w-36" priority />
      </header>

      <main className="mx-auto max-w-5xl px-6 py-10">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Holiday Packages</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Curated getaways, priced and ready to book. Prices shown are per person unless noted otherwise.
        </p>

        {error && <p className="mt-6 text-sm text-red-600 dark:text-red-400">{error}</p>}
        {!packages && !error && <p className="mt-6 text-sm text-slate-400 dark:text-slate-500">Loading…</p>}
        {packages && packages.length === 0 && <p className="mt-6 text-sm text-slate-400 dark:text-slate-500">No packages published yet — check back soon.</p>}

        <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {packages?.map((pkg) => (
            <Link
              key={pkg.id}
              href={`/holidays/${pkg.id}`}
              className="group overflow-hidden rounded-xl border border-slate-200 bg-white shadow-card transition-shadow hover:shadow-card-hover dark:border-slate-700 dark:bg-slate-800"
            >
              <div className="aspect-[4/3] w-full bg-slate-100 dark:bg-slate-900">
                {pkg.coverImageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={pkg.coverImageUrl} alt={pkg.name} className="h-full w-full object-cover transition-transform group-hover:scale-105" />
                )}
              </div>
              <div className="p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-brand dark:text-brand-200">{pkg.destination}</p>
                <h2 className="mt-1 font-semibold text-slate-800 dark:text-slate-100">{pkg.name}</h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{pkg.durationDays} days{pkg.theme ? ` · ${pkg.theme}` : ''}</p>
                <p className="mt-2 text-lg font-bold text-slate-900 dark:text-white">
                  {pkg.currency} {pkg.basePrice.toLocaleString('en-IN')}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
