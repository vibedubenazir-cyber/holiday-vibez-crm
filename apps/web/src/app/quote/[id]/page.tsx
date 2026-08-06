'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';

interface PublicQuotation {
  refNo: string;
  createdAt: string;
  currency: string;
  totalAmount: number;
  client: { name: string; phone: string; email: string | null; destination: string };
  items: { description: string; quantity: number; unitAmount: number; lineTotal: number }[];
  company: { name: string; address: string; gstNumber: string; email: string; phone: string; logoUrl: string | null };
}

export default function PublicQuotationPage() {
  const { id } = useParams<{ id: string }>();
  const [quotation, setQuotation] = useState<PublicQuotation | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API_BASE}/public/quotations/${id}`)
      .then(async (res) => {
        if (!res.ok) throw new Error(res.status === 404 ? 'This quotation is not available.' : 'Failed to load quotation.');
        return res.json();
      })
      .then(setQuotation)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load quotation.'));
  }, [id]);

  if (error) {
    return (
      <div className="mx-auto max-w-2xl p-8 text-center text-slate-500">
        <p>{error}</p>
      </div>
    );
  }

  if (!quotation) {
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
            {quotation.company.logoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={quotation.company.logoUrl} alt={quotation.company.name} className="h-12 w-auto object-contain" />
            )}
            <div>
              <h1 className="text-xl font-bold text-slate-900">{quotation.company.name}</h1>
              {quotation.company.address && <p className="mt-1 max-w-xs text-xs text-slate-500">{quotation.company.address}</p>}
              <p className="mt-1 text-xs text-blue-100">
                {quotation.company.gstNumber && <>GSTIN: {quotation.company.gstNumber}<br /></>}
                {quotation.company.email} {quotation.company.phone && `· ${quotation.company.phone}`}
              </p>
            </div>
          </div>
          <div className="text-right">
            <h2 className="text-lg font-semibold uppercase tracking-wide text-slate-700">Quotation</h2>
            <p className="mt-1 text-sm text-blue-100">No. {quotation.refNo}</p>
            <p className="text-sm text-slate-500">{new Date(quotation.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
          </div>
        </div>

        <div className="mt-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-brand">Prepared for</p>
          <p className="mt-1 font-medium text-slate-800">{quotation.client.name}</p>
          <p className="text-sm text-slate-500">{quotation.client.phone}{quotation.client.email ? ` · ${quotation.client.email}` : ''}</p>
          <p className="text-sm text-slate-500">Destination: {quotation.client.destination}</p>
        </div>

        <table className="mt-8 w-full text-sm">
          <thead className="border-b border-slate-200 text-left text-xs font-semibold uppercase tracking-wide text-brand">
            <tr>
              <th className="py-2">Description</th>
              <th className="py-2 text-right">Qty</th>
              <th className="py-2 text-right">Unit amount</th>
              <th className="py-2 text-right">Line total</th>
            </tr>
          </thead>
          <tbody>
            {quotation.items.map((item, i) => (
              <tr key={i} className="border-b border-slate-100">
                <td className="py-2 pr-4">{item.description}</td>
                <td className="py-2 text-right">{item.quantity}</td>
                <td className="py-2 text-right">{quotation.currency} {item.unitAmount.toLocaleString('en-IN')}</td>
                <td className="py-2 text-right">{quotation.currency} {item.lineTotal.toLocaleString('en-IN')}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="font-semibold">
              <td colSpan={3} className="py-3 text-right">Total</td>
              <td className="py-3 text-right">{quotation.currency} {quotation.totalAmount.toLocaleString('en-IN')}</td>
            </tr>
          </tfoot>
        </table>

        <p className="mt-8 border-t border-slate-200 pt-4 text-xs text-slate-400">
          This quotation is valid for 7 days from the date above. Prices are subject to availability at the time of booking.
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
