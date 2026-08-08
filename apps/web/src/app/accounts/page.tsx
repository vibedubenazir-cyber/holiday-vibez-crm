'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/AppShell';
import { api, ApiError } from '@/lib/api';
import type { AccountsDashboardDTO, DailyLedgerDTO, GstReportDTO } from '@holiday-vibez/shared';

const now = new Date();

const ACCENTS = {
  cyan: { border: 'border-t-cyan-500', text: 'text-cyan-600 dark:text-cyan-400' },
  emerald: { border: 'border-t-emerald-500', text: 'text-emerald-600 dark:text-emerald-400' },
  purple: { border: 'border-t-purple-500', text: 'text-purple-600 dark:text-purple-400' },
  orange: { border: 'border-t-orange-500', text: 'text-orange-600 dark:text-orange-400' },
  rose: { border: 'border-t-rose-500', text: 'text-rose-600 dark:text-rose-400' },
} as const;

function StatCard({ label, value, accent }: { label: string; value: string; accent: keyof typeof ACCENTS }) {
  const c = ACCENTS[accent];
  return (
    <div className={`overflow-hidden rounded-xl border-t-4 ${c.border} bg-brand-50 p-4 shadow-card transition-shadow hover:shadow-card-hover dark:bg-slate-800`}>
      <p className={`text-xs font-semibold uppercase tracking-wide ${c.text}`}>{label}</p>
      <p className="mt-1 text-xl font-bold text-slate-800 dark:text-slate-100">{value}</p>
    </div>
  );
}

const QUICK_LINKS = [
  { href: '/petty-cash', label: 'Petty Cash' },
  { href: '/budgets', label: 'Budget & Forecast' },
  { href: '/bank-reconciliation', label: 'Bank Reconciliation' },
  { href: '/dmc-commissions', label: 'DMC Commissions' },
];

export default function AccountsDashboardPage() {
  const [dashboard, setDashboard] = useState<AccountsDashboardDTO | null>(null);
  const [ledger, setLedger] = useState<DailyLedgerDTO | null>(null);
  const [gst, setGst] = useState<GstReportDTO | null>(null);
  const [ledgerDate, setLedgerDate] = useState(now.toISOString().slice(0, 10));
  const [gstMonth, setGstMonth] = useState(now.getMonth() + 1);
  const [gstYear, setGstYear] = useState(now.getFullYear());
  const [error, setError] = useState<string | null>(null);

  async function loadDashboard() {
    try {
      setDashboard(await api.get<AccountsDashboardDTO>('/reports/accounts-dashboard'));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load accounts dashboard');
    }
  }

  async function loadLedger() {
    try {
      setLedger(await api.get<DailyLedgerDTO>(`/reports/ledger/daily?date=${ledgerDate}`));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load daily ledger');
    }
  }

  async function loadGst() {
    try {
      setGst(await api.get<GstReportDTO>(`/reports/gst?year=${gstYear}&month=${gstMonth}`));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load GST report');
    }
  }

  useEffect(() => {
    loadDashboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadLedger();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ledgerDate]);

  useEffect(() => {
    loadGst();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gstMonth, gstYear]);

  return (
    <AppShell>
      <h1 className="inline-block rounded-lg bg-brand-50 px-4 py-2 text-xl font-bold tracking-tight text-brand shadow-card">Accounts Dashboard</h1>
      <p className="mt-1 text-sm text-blue-100">Everything under Accounts, at a glance.</p>
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      {dashboard && (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <StatCard accent="cyan" label="Today's net cash flow" value={`₹${dashboard.todayNetCashFlow.toLocaleString('en-IN')}`} />
          <StatCard accent="emerald" label="Petty cash balance" value={`₹${dashboard.pettyCashBalance.toLocaleString('en-IN')}`} />
          <StatCard accent="purple" label="GST collected (this month)" value={`₹${dashboard.gstCollectedThisMonth.toLocaleString('en-IN')}`} />
          <StatCard accent="orange" label="Budgeted (this month)" value={`₹${dashboard.budgetedThisMonth.toLocaleString('en-IN')} · ${dashboard.budgetCategoryCount} categories`} />
          <StatCard accent={dashboard.unmatchedBankTransactions > 0 ? 'rose' : 'emerald'} label="Unmatched bank lines" value={String(dashboard.unmatchedBankTransactions)} />
          <StatCard accent={dashboard.pendingDmcCommissions > 0 ? 'rose' : 'emerald'} label="Pending DMC commissions" value={`${dashboard.pendingDmcCommissions} · ₹${dashboard.pendingDmcCommissionAmount.toLocaleString('en-IN')}`} />
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        {QUICK_LINKS.map((l) => (
          <Link key={l.href} href={l.href} className="rounded-lg bg-brand-50 px-3 py-1.5 text-sm font-medium text-brand shadow-card hover:shadow-card-hover">
            {l.label} →
          </Link>
        ))}
      </div>

      <div className="mt-6 rounded-lg bg-brand-50 p-4 shadow-card dark:bg-slate-800">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Daily Ledger</p>
          <input type="date" value={ledgerDate} onChange={(e) => setLedgerDate(e.target.value)} className="rounded-lg border border-slate-300 px-2 py-1 text-sm" />
        </div>
        {ledger && (
          <>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              In ₹{ledger.totalIn.toLocaleString('en-IN')} · Out ₹{ledger.totalOut.toLocaleString('en-IN')} · Net ₹{ledger.net.toLocaleString('en-IN')}
            </p>
            <table className="mt-2 w-full text-sm">
              <thead className="text-left text-xs font-semibold uppercase tracking-wide text-brand">
                <tr><th className="py-1">Source</th><th className="py-1">Description</th><th className="py-1 text-right">Amount</th></tr>
              </thead>
              <tbody>
                {ledger.rows.map((r, i) => (
                  <tr key={i} className="border-t border-slate-100 dark:border-slate-700">
                    <td className="py-1.5 text-slate-500">{r.source.replaceAll('_', ' ')}</td>
                    <td className="py-1.5 text-slate-700 dark:text-slate-200">{r.description}</td>
                    <td className={`py-1.5 text-right ${r.direction === 'IN' ? 'text-blue-700' : 'text-amber-700'}`}>
                      {r.direction === 'IN' ? '+' : '-'}₹{r.amount.toLocaleString('en-IN')}
                    </td>
                  </tr>
                ))}
                {ledger.rows.length === 0 && <tr><td colSpan={3} className="py-4 text-center text-slate-400">No transactions this day.</td></tr>}
              </tbody>
            </table>
          </>
        )}
      </div>

      <div className="mt-4 rounded-lg bg-brand-50 p-4 shadow-card dark:bg-slate-800">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">GST Report</p>
          <div className="flex gap-2">
            <select value={gstMonth} onChange={(e) => setGstMonth(Number(e.target.value))} className="rounded-lg border border-slate-300 px-2 py-1 text-sm">
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={m}>{new Date(2000, m - 1).toLocaleString('en-IN', { month: 'long' })}</option>
              ))}
            </select>
            <select value={gstYear} onChange={(e) => setGstYear(Number(e.target.value))} className="rounded-lg border border-slate-300 px-2 py-1 text-sm">
              {[now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </div>
        {gst && (
          <>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              {gst.invoiceCount} invoice{gst.invoiceCount === 1 ? '' : 's'} · Taxable value ₹{gst.taxableValue.toLocaleString('en-IN')} · GST collected ₹{gst.gstCollected.toLocaleString('en-IN')} · Total ₹{gst.totalInvoiced.toLocaleString('en-IN')}
            </p>
            <table className="mt-2 w-full text-sm">
              <thead className="text-left text-xs font-semibold uppercase tracking-wide text-brand">
                <tr><th className="py-1">Invoice</th><th className="py-1">GSTIN</th><th className="py-1 text-right">Taxable</th><th className="py-1 text-right">GST</th></tr>
              </thead>
              <tbody>
                {gst.rows.map((r) => (
                  <tr key={r.invoiceNo} className="border-t border-slate-100 dark:border-slate-700">
                    <td className="py-1.5 text-slate-700 dark:text-slate-200">{r.invoiceNo}</td>
                    <td className="py-1.5 text-slate-500">{r.customerGstin ?? '—'}</td>
                    <td className="py-1.5 text-right">₹{r.amount.toLocaleString('en-IN')}</td>
                    <td className="py-1.5 text-right">₹{r.taxAmount.toLocaleString('en-IN')} ({r.gstRate}%)</td>
                  </tr>
                ))}
                {gst.rows.length === 0 && <tr><td colSpan={4} className="py-4 text-center text-slate-400">No GST invoices this period.</td></tr>}
              </tbody>
            </table>
          </>
        )}
      </div>
    </AppShell>
  );
}

