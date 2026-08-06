'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/AppShell';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import type { BranchDTO, BookingDTO, LeadSummaryDTO, QuotationSummaryDTO } from '@holiday-vibez/shared';

export default function DashboardPage() {
  const { user } = useAuth();
  const [leadCount, setLeadCount] = useState<number | null>(null);
  const [quotationCount, setQuotationCount] = useState<number | null>(null);
  const [bookingCount, setBookingCount] = useState<number | null>(null);
  const [branchName, setBranchName] = useState<string | null>(null);

  useEffect(() => {
    api.get<LeadSummaryDTO[]>('/leads').then((rows) => setLeadCount(rows.length)).catch(() => setLeadCount(null));
    api.get<QuotationSummaryDTO[]>('/quotations').then((rows) => setQuotationCount(rows.length)).catch(() => setQuotationCount(null));
    api.get<BookingDTO[]>('/bookings').then((rows) => setBookingCount(rows.length)).catch(() => setBookingCount(null));
    if (user?.branchId) {
      api.get<BranchDTO[]>('/branches').then((rows) => setBranchName(rows.find((b) => b.id === user.branchId)?.name ?? null)).catch(() => undefined);
    }
  }, [user]);

  return (
    <AppShell>
      <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">Welcome, {user?.name}</h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Here&apos;s what&apos;s happening across your workspace right now.</p>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <DashCard color="brand" label="Role" value={user?.role ?? '—'} />
        <DashCard color="purple" label="Branch" value={branchName ?? (user?.branchId ? '—' : 'All branches')} />
        <DashCard color="emerald" label="Status" value={user?.status ?? '—'} />
      </div>

      <h2 className="mt-8 text-sm font-semibold text-slate-700 dark:text-slate-200">Your workspace at a glance</h2>
      <div className="mt-2 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Link href="/leads">
          <DashCard color="cyan" label="Leads" value={leadCount === null ? '—' : leadCount.toString()} />
        </Link>
        <Link href="/quotations">
          <DashCard color="orange" label="Quotations" value={quotationCount === null ? '—' : quotationCount.toString()} />
        </Link>
        <Link href="/bookings">
          <DashCard color="pink" label="Bookings" value={bookingCount === null ? '—' : bookingCount.toString()} />
        </Link>
      </div>

      <p className="mt-8 text-xs text-slate-400 dark:text-slate-500">
        Looking for revenue, margin, and branch targets? Head to <Link href="/reports" className="text-brand hover:underline">Reports</Link>.
      </p>
    </AppShell>
  );
}

const COLORS = {
  brand: { border: 'border-t-brand', text: 'text-brand dark:text-brand-200' },
  purple: { border: 'border-t-purple-500', text: 'text-purple-600 dark:text-purple-300' },
  emerald: { border: 'border-t-emerald-500', text: 'text-emerald-600 dark:text-emerald-300' },
  cyan: { border: 'border-t-cyan-500', text: 'text-cyan-600 dark:text-cyan-300' },
  orange: { border: 'border-t-accent', text: 'text-accent-dark dark:text-accent' },
  pink: { border: 'border-t-pink-500', text: 'text-pink-600 dark:text-pink-300' },
} as const;

function DashCard({ label, value, color }: { label: string; value: string; color: keyof typeof COLORS }) {
  const c = COLORS[color];
  return (
    <div className={`rounded-xl border-t-4 ${c.border} border-x border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-card transition-shadow hover:shadow-card-hover p-4`}>
      <p className={`text-xs font-semibold uppercase tracking-wide ${c.text}`}>{label}</p>
      <p className="mt-1 text-base font-medium text-slate-800 dark:text-slate-100">{value}</p>
    </div>
  );
}
