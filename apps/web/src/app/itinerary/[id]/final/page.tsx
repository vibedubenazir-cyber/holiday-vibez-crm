'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { ItineraryReport, type ItineraryReportData } from '@/components/ItineraryReport';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';

export default function PublicItineraryPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<ItineraryReportData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API_BASE}/public/itineraries/${id}`)
      .then(async (res) => {
        if (!res.ok) throw new Error(res.status === 404 ? 'This itinerary is not available.' : 'Failed to load itinerary.');
        return res.json();
      })
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load itinerary.'));
  }, [id]);

  if (error) {
    return (
      <div className="mx-auto max-w-2xl p-8 text-center text-slate-500">
        <p>{error}</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="mx-auto max-w-2xl p-8 text-center text-slate-400">
        <p>Loading…</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl p-6 sm:p-10 print:p-0">
      <div className="no-print mb-6 flex justify-end gap-2">
        <a
          href={`${API_BASE}/public/itineraries/${id}/pdf`}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800"
        >
          Download PDF
        </a>
        <button onClick={() => window.print()} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
          Print
        </button>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-8 shadow-sm print:border-none print:shadow-none">
        <ItineraryReport data={data} />
      </div>

      <style>{`
        @media print {
          .no-print { display: none; }
          body { background: white; }
        }
      `}</style>
    </div>
  );
}
