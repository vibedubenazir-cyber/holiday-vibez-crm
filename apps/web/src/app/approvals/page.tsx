'use client';

import { useEffect, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { api, ApiError } from '@/lib/api';
import type { QuotationSummaryDTO } from '@holiday-vibez/shared';

export default function ApprovalsPage() {
  const [quotations, setQuotations] = useState<QuotationSummaryDTO[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      const all = await api.get<QuotationSummaryDTO[]>('/quotations');
      setQuotations(all.filter((q) => q.status === 'PENDING_APPROVAL'));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load approval queue');
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleApprove(id: string) {
    try {
      await api.post(`/quotations/${id}/approve`);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to approve quotation');
    }
  }

  async function handleReject(id: string) {
    const comments = window.prompt('Reason for rejection (sent back to the consultant):') ?? undefined;
    try {
      await api.post(`/quotations/${id}/reject`, { comments });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to reject quotation');
    }
  }

  return (
    <AppShell>
      <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">Approval Queue</h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        Hard gate — no quotation reaches a customer until a Branch Manager approves it here.
      </p>
      {error && <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>}

      <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-card transition-shadow hover:shadow-card-hover">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 dark:bg-slate-900 text-left text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
            <tr>
              <th className="px-4 py-2">Ref No</th>
              <th className="px-4 py-2">Client</th>
              <th className="px-4 py-2">Total</th>
              <th className="px-4 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {quotations.map((q) => (
              <tr key={q.id} className="border-t border-slate-100 dark:border-slate-800">
                <td className="px-4 py-2 font-medium text-slate-800 dark:text-slate-100">{q.refNo}</td>
                <td className="px-4 py-2">{q.lead?.clientName ?? '—'}</td>
                <td className="px-4 py-2">₹{Number(q.totalAmount).toLocaleString('en-IN')}</td>
                <td className="px-4 py-2 text-right">
                  <button onClick={() => handleApprove(q.id)} className="mr-3 text-emerald-600 hover:underline">Approve & send</button>
                  <button onClick={() => handleReject(q.id)} className="text-red-600 dark:text-red-400 hover:underline">Reject</button>
                </td>
              </tr>
            ))}
            {quotations.length === 0 && <tr><td colSpan={4} className="px-4 py-6 text-center text-slate-400 dark:text-slate-500">Nothing pending approval.</td></tr>}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}
