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
      <h1 className="inline-block rounded-lg bg-white px-4 py-2 text-xl font-bold tracking-tight text-brand shadow-card">Welcome, {user?.name}</h1>
      <p className="mt-1 text-sm text-blue-100">Here&apos;s what&apos;s happening across your workspace right now.</p>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <DashCard color="brand" label="Role" value={user?.role ?? '—'} />
        <DashCard color="purple" label="Branch" value={branchName ?? (user?.branchId ? '—' : 'All branches')} />
        <DashCard color="emerald" label="Status" value={user?.status ?? '—'} />
      </div>

      <h2 className="mt-8 text-sm font-semibold text-white">Your workspace at a glance</h2>
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

      <p className="mt-8 text-xs text-blue-100">
        Looking for revenue, margin, and branch targets? Head to <Link href="/reports" className="font-semibold text-white hover:underline">Reports</Link>.
      </p>
    </AppShell>
  );
}

const COLORS = {
  brand: { border: 'border-l-brand', text: 'text-brand' },
  purple: { border: 'border-l-blue-500', text: 'text-blue-600' },
  emerald: { border: 'border-l-blue-500', text: 'text-blue-600' },
  cyan: { border: 'border-l-blue-500', text: 'text-blue-600' },
  orange: { border: 'border-l-brand-500', text: 'text-brand-700' },
  pink: { border: 'border-l-blue-500', text: 'text-blue-600' },
} as const;

function DashCard({ label, value, color }: { label: string; value: string; color: keyof typeof COLORS }) {
  const c = COLORS[color];
  return (
    <div className={`border-l-4 ${c.border} bg-white p-4`}>
      <p className={`text-xs font-semibold uppercase tracking-wide ${c.text}`}>{label}</p>
      <p className="mt-1 text-base font-medium text-slate-800">{value}</p>
    </div>
  );
}
