'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import type { PublicPackageDetailDTO } from '@holiday-vibez/shared';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';

export default function PublicHolidayDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [pkg, setPkg] = useState<PublicPackageDetailDTO | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API_BASE}/public/packages/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error('Not found');
        return res.json();
      })
      .then(setPkg)
      .catch(() => setError('This package is not available.'));
  }, [id]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-brand-50/40 to-slate-50 dark:from-slate-950 dark:via-slate-950 dark:to-slate-950">
      <header className="border-b border-slate-200 bg-white/80 px-6 py-5 backdrop-blur dark:border-slate-800 dark:bg-slate-900/80">
        <Link href="/holidays">
          <Image src="/logo.png" alt="Holiday Vibez" width={160} height={40} className="h-auto w-36" priority />
        </Link>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-10">
        <Link href="/holidays" className="text-sm text-brand hover:underline">
          ← All packages
        </Link>

        {error && <p className="mt-6 text-sm text-red-600 dark:text-red-400">{error}</p>}
        {!pkg && !error && <p className="mt-6 text-sm text-slate-400 dark:text-slate-500">Loading…</p>}

        {pkg && (
          <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-card dark:border-slate-700 dark:bg-slate-800">
            <div className="aspect-[16/9] w-full bg-slate-100 dark:bg-slate-900">
              {pkg.coverImageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={pkg.coverImageUrl} alt={pkg.name} className="h-full w-full object-cover" />
              )}
            </div>
            <div className="p-6">
              <p className="text-xs font-semibold uppercase tracking-wide text-brand dark:text-brand-200">{pkg.destination}</p>
              <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">{pkg.name}</h1>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{pkg.durationDays} days{pkg.theme ? ` · ${pkg.theme}` : ''}</p>
              <p className="mt-3 text-2xl font-bold text-slate-900 dark:text-white">
                {pkg.currency} {pkg.basePrice.toLocaleString('en-IN')}
              </p>

              {pkg.items.length > 0 && (
                <div className="mt-6 border-t border-slate-100 pt-4 dark:border-slate-800">
                  <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Itinerary</h2>
                  <ul className="mt-2 space-y-2">
                    {pkg.items.map((item, i) => (
                      <li key={i} className="text-sm text-slate-600 dark:text-slate-300">
                        <span className="font-medium text-slate-800 dark:text-slate-100">Day {item.dayNumber}:</span> {item.description}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <p className="mt-6 text-xs text-slate-400 dark:text-slate-500">
                Interested? Reach out to our team and we&apos;ll put together a personalised quote for you.
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
