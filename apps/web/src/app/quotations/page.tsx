'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/AppShell';
import { api, ApiError } from '@/lib/api';
import type { QuotationSummaryDTO } from '@holiday-vibez/shared';

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-slate-200 text-slate-600',
  PENDING_APPROVAL: 'bg-blue-100 text-blue-700',
  APPROVED: 'bg-blue-100 text-blue-700',
  SENT: 'bg-blue-100 text-blue-700',
  REJECTED: 'bg-red-100 text-red-700',
};

export default function QuotationsPage() {
  const [quotations, setQuotations] = useState<QuotationSummaryDTO[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<QuotationSummaryDTO[]>('/quotations')
      .then(setQuotations)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Failed to load quotations'));
  }, []);

  return (
    <AppShell>
      <h1 className="inline-block rounded-lg bg-brand-50 px-4 py-2 text-xl font-bold tracking-tight text-brand shadow-card">Quotations</h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Start a quotation from a lead's page. Drafts are built here by selecting rate cards.</p>
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      <div className="mt-4 overflow-hidden bg-white dark:bg-slate-800">
        <table className="w-full text-sm">
          <thead className="bg-brand-50/60 text-left text-xs font-semibold uppercase tracking-wide text-brand-700 dark:bg-slate-900/40 dark:text-brand-300">
            <tr>
              <th className="px-4 py-2">Ref No</th>
              <th className="px-4 py-2">Client</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">Total</th>
              <th className="px-4 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {quotations.map((q) => (
              <tr key={q.id} className="border-t border-slate-100">
                <td className="px-4 py-2 font-medium text-slate-800">{q.refNo}</td>
                <td className="px-4 py-2">{q.lead?.clientName ?? '—'}</td>
                <td className="px-4 py-2">
                  <span className={`rounded-lg px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[q.status] ?? 'bg-slate-100'}`}>{q.status}</span>
                </td>
                <td className="px-4 py-2">₹{Number(q.totalAmount).toLocaleString('en-IN')}</td>
                <td className="px-4 py-2 text-right"><Link href={`/quotations/${q.id}`} className="text-brand hover:underline">Open</Link></td>
              </tr>
            ))}
            {quotations.length === 0 && <tr><td colSpan={5} className="px-4 py-6 text-center text-slate-400">No quotations yet — open a lead to start one.</td></tr>}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}
