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
      <h1 className="text-2xl font-extrabold tracking-tight text-brand-700">Quotations</h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Start a quotation from a lead's page. Drafts are built here by selecting rate cards.</p>
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      {/* Phones get cards, not the table. Five columns can only be reached by
          horizontal scrolling on a 390px screen, which means scrubbing back and
          forth to tie a client to its status — the table stays for md and up. */}
      <div className="mt-4 space-y-2 md:hidden">
        {quotations.map((q) => (
          <div key={q.id} className="rounded-xl bg-white p-3 shadow-card dark:bg-slate-800">
            <div className="flex items-start gap-3">
              <Link href={`/quotations/${q.id}`} className="min-w-0 flex-1">
                <p className="truncate font-semibold text-slate-800 dark:text-slate-100">{q.lead?.clientName ?? '—'}</p>
              </Link>
              <Link href={`/quotations/${q.id}`} className="shrink-0 font-mono text-[11px] font-semibold text-brand hover:underline">
                {q.refNo}
              </Link>
            </div>

            <Link href={`/quotations/${q.id}`} className="mt-2 block truncate text-sm text-slate-600 dark:text-slate-300">
              ₹{Number(q.totalAmount).toLocaleString('en-IN')}
            </Link>

            <div className="mt-2 flex items-center justify-between gap-2">
              <span className={`rounded-lg px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[q.status] ?? 'bg-slate-100'}`}>{q.status}</span>
              <div className="flex shrink-0 items-center gap-1">
                <Link href={`/quotations/${q.id}`} className="rounded-lg p-2 text-sm font-medium text-brand hover:underline">
                  Open
                </Link>
              </div>
            </div>
          </div>
        ))}
        {quotations.length === 0 && (
          <p className="rounded-xl bg-white px-4 py-6 text-center text-slate-400 shadow-card dark:bg-slate-800">
            No quotations yet — open a lead to start one.
          </p>
        )}
      </div>

      <div className="mt-4 hidden overflow-x-auto bg-white dark:bg-slate-800 md:block">
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
