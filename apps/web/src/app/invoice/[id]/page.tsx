'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';

interface PublicInvoice {
  invoiceNo: string;
  type: string;
  issuedAt: string;
  amount: number;
  gstRate: number;
  taxAmount: number;
  customerGstin: string | null;
  currency: string;
  client: { name: string; phone: string; email: string | null; destination: string };
  company: { name: string; address: string; gstNumber: string; email: string; phone: string; logoUrl: string | null };
}

export default function PublicInvoicePage() {
  const { id } = useParams<{ id: string }>();
  const [invoice, setInvoice] = useState<PublicInvoice | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API_BASE}/public/invoices/${id}`)
      .then(async (res) => {
        if (!res.ok) throw new Error(res.status === 404 ? 'This invoice is not available.' : 'Failed to load invoice.');
        return res.json();
      })
      .then(setInvoice)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load invoice.'));
  }, [id]);

  if (error) {
    return (
      <div className="mx-auto max-w-2xl p-8 text-center text-slate-500">
        <p>{error}</p>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="mx-auto max-w-2xl p-8 text-center text-slate-400">
        <p>Loading…</p>
      </div>
    );
  }

  const total = invoice.amount + invoice.taxAmount;

  return (
    <div className="mx-auto max-w-3xl p-6 sm:p-10 text-slate-800 print:p-0">
      <div className="no-print mb-6 flex justify-end gap-2">
        <a
          href={`${API_BASE}/public/invoices/${id}/pdf`}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800"
        >
          Download PDF
        </a>
        <button
          onClick={() => window.print()}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Print
        </button>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm print:border-none print:shadow-none sm:p-8">
        <div className="flex flex-col gap-4 border-b border-slate-200 pb-6 sm:flex-row sm:items-start sm:justify-between sm:gap-0">
          <div className="flex items-start gap-4">
            {invoice.company.logoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={invoice.company.logoUrl} alt={invoice.company.name} className="h-12 w-auto object-contain" />
            )}
            <div>
              <h1 className="text-xl font-bold text-slate-900">{invoice.company.name}</h1>
              {invoice.company.address && <p className="mt-1 max-w-xs text-xs text-slate-500">{invoice.company.address}</p>}
              <p className="mt-1 text-xs text-slate-500">
                {invoice.company.gstNumber && <>GSTIN: {invoice.company.gstNumber}<br /></>}
                {invoice.company.email} {invoice.company.phone && `· ${invoice.company.phone}`}
              </p>
            </div>
          </div>
          <div className="sm:text-right">
            <h2 className="text-lg font-semibold uppercase tracking-wide text-slate-700">Tax Invoice</h2>
            <p className="mt-1 text-sm text-slate-500">No. {invoice.invoiceNo}</p>
            <p className="text-sm text-slate-500">{new Date(invoice.issuedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
          </div>
        </div>

        <div className="mt-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-brand">Billed to</p>
          <p className="mt-1 font-medium text-slate-800">{invoice.client.name}</p>
          <p className="text-sm text-slate-500">{invoice.client.phone}{invoice.client.email ? ` · ${invoice.client.email}` : ''}</p>
          <p className="text-sm text-slate-500">Destination: {invoice.client.destination}</p>
          {invoice.customerGstin && <p className="text-sm text-slate-500">GSTIN: {invoice.customerGstin}</p>}
        </div>

        <table className="mt-8 w-full text-sm">
          <tbody>
            <tr className="border-b border-slate-100">
              <td className="py-2 text-slate-600">Amount</td>
              <td className="py-2 text-right">{invoice.currency} {invoice.amount.toLocaleString('en-IN')}</td>
            </tr>
            <tr className="border-b border-slate-100">
              <td className="py-2 text-slate-600">GST ({invoice.gstRate}%)</td>
              <td className="py-2 text-right">{invoice.currency} {invoice.taxAmount.toLocaleString('en-IN')}</td>
            </tr>
          </tbody>
          <tfoot>
            <tr className="font-semibold">
              <td className="py-3">Total</td>
              <td className="py-3 text-right">{invoice.currency} {total.toLocaleString('en-IN')}</td>
            </tr>
          </tfoot>
        </table>

        <p className="mt-8 border-t border-slate-200 pt-4 text-xs text-slate-400">
          Thank you for booking with {invoice.company.name}. Contact your travel consultant with any billing questions.
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
