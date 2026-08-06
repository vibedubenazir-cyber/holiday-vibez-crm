'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';

interface PublicVoucher {
  refNo: string;
  type: string;
  issuedAt: string;
  departureDate: string;
  client: { name: string; phone: string; email: string | null; destination: string };
  items: { description: string; quantity: number }[];
  company: { name: string; address: string; gstNumber: string; email: string; phone: string; logoUrl: string | null };
}

export default function PublicVoucherPage() {
  const { id } = useParams<{ id: string }>();
  const [voucher, setVoucher] = useState<PublicVoucher | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API_BASE}/public/vouchers/${id}`)
      .then(async (res) => {
        if (!res.ok) throw new Error(res.status === 404 ? 'This voucher is not available.' : 'Failed to load voucher.');
        return res.json();
      })
      .then(setVoucher)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load voucher.'));
  }, [id]);

  if (error) {
    return (
      <div className="mx-auto max-w-2xl p-8 text-center text-slate-500">
        <p>{error}</p>
      </div>
    );
  }

  if (!voucher) {
    return (
      <div className="mx-auto max-w-2xl p-8 text-center text-slate-400">
        <p>Loading…</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl p-6 sm:p-10 text-slate-800 print:p-0">
      <div className="no-print mb-6 flex justify-end">
        <button
          onClick={() => window.print()}
          className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800"
        >
          Print / Save as PDF
        </button>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-8 shadow-sm print:border-none print:shadow-none">
        <div className="flex items-start justify-between border-b border-slate-200 pb-6">
          <div className="flex items-start gap-4">
            {voucher.company.logoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={voucher.company.logoUrl} alt={voucher.company.name} className="h-12 w-auto object-contain" />
            )}
            <div>
              <h1 className="text-xl font-bold text-slate-900">{voucher.company.name}</h1>
              {voucher.company.address && <p className="mt-1 max-w-xs text-xs text-slate-500">{voucher.company.address}</p>}
              <p className="mt-1 text-xs text-slate-500">
                {voucher.company.email} {voucher.company.phone && `· ${voucher.company.phone}`}
              </p>
            </div>
          </div>
          <div className="text-right">
            <h2 className="text-lg font-semibold uppercase tracking-wide text-slate-700">{voucher.type.toLowerCase()} voucher</h2>
            <p className="mt-1 text-sm text-slate-500">No. {voucher.refNo}</p>
            <p className="text-sm text-slate-500">{new Date(voucher.issuedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
          </div>
        </div>

        <div className="mt-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-brand">Prepared for</p>
          <p className="mt-1 font-medium text-slate-800">{voucher.client.name}</p>
          <p className="text-sm text-slate-500">{voucher.client.phone}{voucher.client.email ? ` · ${voucher.client.email}` : ''}</p>
          <p className="text-sm text-slate-500">Destination: {voucher.client.destination}</p>
          <p className="text-sm text-slate-500">Departure: {new Date(voucher.departureDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
        </div>

        {voucher.items.length > 0 && (
          <div className="mt-8">
            <p className="text-xs font-semibold uppercase tracking-wide text-brand">What&apos;s included</p>
            <ul className="mt-2 space-y-1">
              {voucher.items.map((item, i) => (
                <li key={i} className="text-sm text-slate-700">
                  {item.description}{item.quantity > 1 ? ` × ${item.quantity}` : ''}
                </li>
              ))}
            </ul>
          </div>
        )}

        <p className="mt-8 border-t border-slate-200 pt-4 text-xs text-slate-400">
          Please present this voucher (printed or on your phone) at check-in/pickup. Contact your travel consultant for any changes.
        </p>
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
