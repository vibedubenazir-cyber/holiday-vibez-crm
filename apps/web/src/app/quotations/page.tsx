'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/AppShell';
import { api, ApiError } from '@/lib/api';
import type { QuotationSummaryDTO } from '@holiday-vibez/shared';

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-slate-200 text-slate-600 dark:text-slate-300',
  PENDING_APPROVAL: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
  APPROVED: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400',
  SENT: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
  REJECTED: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
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
      <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">Quotations</h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Start a quotation from a lead's page. Drafts are built here by selecting rate cards.</p>
      {error && <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>}
      <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-card transition-shadow hover:shadow-card-hover">
        <table className="w-full text-sm">
          <thead className="bg-brand-50/60 dark:bg-slate-900 text-left text-xs font-semibold uppercase tracking-wide text-brand-700 dark:text-slate-400">
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
              <tr key={q.id} className="border-t border-slate-100 dark:border-slate-800">
                <td className="px-4 py-2 font-medium text-slate-800 dark:text-slate-100">{q.refNo}</td>
                <td className="px-4 py-2">{q.lead?.clientName ?? '—'}</td>
                <td className="px-4 py-2">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[q.status] ?? 'bg-slate-100 dark:bg-slate-700'}`}>{q.status}</span>
                </td>
                <td className="px-4 py-2">₹{Number(q.totalAmount).toLocaleString('en-IN')}</td>
                <td className="px-4 py-2 text-right"><Link href={`/quotations/${q.id}`} className="text-brand hover:underline">Open</Link></td>
              </tr>
            ))}
            {quotations.length === 0 && <tr><td colSpan={5} className="px-4 py-6 text-center text-slate-400 dark:text-slate-500">No quotations yet — open a lead to start one.</td></tr>}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}
