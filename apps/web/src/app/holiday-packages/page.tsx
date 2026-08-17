'use client';

import { useEffect, useState } from 'react';
import { absoluteUploadUrl } from '@/lib/upload';
import type { WebsitePackageCardDTO } from '@holiday-vibez/shared';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

// Public marketing page — no login, no AppShell, same unauthenticated template
// as /itinerary/[id]/final. Lists every itinerary flagged Show on Website that
// is published and still within its validity window.
export default function HolidayPackagesPage() {
  const [items, setItems] = useState<WebsitePackageCardDTO[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API_BASE}/public/website-packages`)
      .then(async (res) => {
        if (!res.ok) throw new Error('Failed to load packages.');
        return res.json();
      })
      .then(setItems)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load packages.'));
  }, []);

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-blue-700 px-6 py-10 text-center text-white">
        <p className="text-sm font-semibold uppercase tracking-widest text-blue-200">Holiday Vibez</p>
        <h1 className="mt-2 text-3xl font-bold">Holiday Packages</h1>
        <p className="mt-2 text-blue-100">Handcrafted itineraries by our travel experts</p>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        {error && <p className="text-center text-slate-500">{error}</p>}
        {!error && items === null && <p className="text-center text-slate-400">Loading…</p>}
        {items !== null && items.length === 0 && <p className="text-center text-slate-500">No packages available right now — check back soon.</p>}

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {(items ?? []).map((pkg) => (
            <div key={pkg.id} className="flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md">
              <div className="relative h-48 w-full bg-slate-200">
                {pkg.coverPhotoUrl && <img src={absoluteUploadUrl(pkg.coverPhotoUrl)} alt="" className="absolute inset-0 h-full w-full object-cover" />}
                <div className="absolute left-3 top-3 flex gap-2">
                  {pkg.isPopular && <span className="rounded-full bg-orange-500 px-3 py-1 text-xs font-semibold text-white">Popular</span>}
                  {pkg.isSpecial && <span className="rounded-full bg-purple-600 px-3 py-1 text-xs font-semibold text-white">Special</span>}
                </div>
                <span className="absolute bottom-3 right-3 rounded-full bg-black/60 px-3 py-1 text-xs font-medium text-white">
                  {pkg.nights} Nights / {pkg.days} Days
                </span>
              </div>

              <div className="flex flex-1 flex-col p-5">
                <h2 className="text-lg font-bold text-brand-700">{pkg.title}</h2>
                <p className="mt-1 text-sm text-slate-500">{pkg.destinations.join(' · ')}</p>
                {pkg.aboutPackage && <p className="mt-2 line-clamp-3 text-sm text-slate-600">{pkg.aboutPackage}</p>}

                <div className="mt-auto pt-4">
                  {pkg.pricePerPerson !== null && (
                    <p className="text-xl font-bold text-blue-700">
                      INR {Number(pkg.pricePerPerson).toLocaleString('en-IN')}
                      <span className="ml-1 text-xs font-normal text-slate-400">per person</span>
                    </p>
                  )}
                  {pkg.validUntil && <p className="mt-1 text-xs text-slate-400">Valid till {formatDate(pkg.validUntil)}</p>}
                  <a
                    href={`/itinerary/${pkg.id}/final`}
                    className="mt-3 block rounded-lg bg-blue-700 px-4 py-2 text-center text-sm font-medium text-white hover:bg-blue-800"
                  >
                    View Full Itinerary
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>

      <footer className="border-t border-slate-200 bg-white px-6 py-6 text-center text-xs text-slate-400">
        © {new Date().getFullYear()} Holiday Vibez · All packages subject to availability
      </footer>
    </div>
  );
}
