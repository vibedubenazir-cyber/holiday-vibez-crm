'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/AppShell';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import {
  BookingStatus,
  LeadStatus,
  LeadTemperature,
  Role,
  type BranchDTO,
  type BookingDTO,
  type LeadSummaryDTO,
  type QuotationSummaryDTO,
  type TargetDTO,
  type LeaderboardRowDTO,
} from '@holiday-vibez/shared';

type RangeKey = 'today' | 'month' | 'year' | 'custom';
type Bucket = 'pending' | 'progress' | 'booked' | 'lost';

const STATUS_META: Record<LeadStatus, { label: string; bucket: Bucket; dot: string }> = {
  [LeadStatus.NEW]: { label: 'New', bucket: 'pending', dot: 'bg-sky-500' },
  [LeadStatus.NO_CONNECT]: { label: 'No connect', bucket: 'pending', dot: 'bg-slate-400' },
  [LeadStatus.PROPOSAL_SENT]: { label: 'Proposal sent', bucket: 'progress', dot: 'bg-indigo-500' },
  [LeadStatus.HOT_LEAD]: { label: 'Hot lead', bucket: 'progress', dot: 'bg-orange-500' },
  [LeadStatus.PROPOSAL_CONFIRMED]: { label: 'Proposal confirmed', bucket: 'progress', dot: 'bg-teal-500' },
  [LeadStatus.FOLLOW_UP]: { label: 'Follow up', bucket: 'progress', dot: 'bg-amber-500' },
  [LeadStatus.POSTPONED]: { label: 'Postponed', bucket: 'progress', dot: 'bg-purple-500' },
  [LeadStatus.CONFIRMED]: { label: 'Booked', bucket: 'booked', dot: 'bg-emerald-500' },
  [LeadStatus.PLAN_DROPPED]: { label: 'Plan dropped', bucket: 'lost', dot: 'bg-rose-500' },
  [LeadStatus.JUNK_NOT_INTERESTED]: { label: 'Junk / not interested', bucket: 'lost', dot: 'bg-zinc-400' },
};

const BUCKET_META: Record<Bucket, { label: string; gradient: string; text: string; ring: string }> = {
  pending: { label: 'Pending / New', gradient: 'from-sky-500 to-cyan-500', text: 'text-sky-600 dark:text-sky-400', ring: 'ring-sky-200 dark:ring-sky-900' },
  progress: { label: 'Contacted / In progress', gradient: 'from-amber-500 to-orange-500', text: 'text-amber-600 dark:text-amber-400', ring: 'ring-amber-200 dark:ring-amber-900' },
  booked: { label: 'Booked', gradient: 'from-emerald-500 to-teal-500', text: 'text-emerald-600 dark:text-emerald-400', ring: 'ring-emerald-200 dark:ring-emerald-900' },
  lost: { label: 'Lost', gradient: 'from-rose-500 to-pink-500', text: 'text-rose-600 dark:text-rose-400', ring: 'ring-rose-200 dark:ring-rose-900' },
};

function startOfDay(d: Date) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; }
function endOfDay(d: Date) { const x = new Date(d); x.setHours(23, 59, 59, 999); return x; }
function startOfMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth(), 1); }
function startOfYear(d: Date) { return new Date(d.getFullYear(), 0, 1); }
function toInputDate(d: Date) { return d.toISOString().slice(0, 10); }

const CLOSED = [LeadStatus.CONFIRMED, LeadStatus.PLAN_DROPPED, LeadStatus.JUNK_NOT_INTERESTED];

export default function DashboardPage() {
  const { user } = useAuth();
  const [leads, setLeads] = useState<LeadSummaryDTO[]>([]);
  const [bookings, setBookings] = useState<BookingDTO[]>([]);
  const [quotationCount, setQuotationCount] = useState<number | null>(null);
  const [branchName, setBranchName] = useState<string | null>(null);
  const [target, setTarget] = useState<TargetDTO | null>(null);
  const [companyLeaderboard, setCompanyLeaderboard] = useState<LeaderboardRowDTO[]>([]);
  const [range, setRange] = useState<RangeKey>('month');
  const now = useMemo(() => new Date(), []);
  const [customFrom, setCustomFrom] = useState(toInputDate(startOfMonth(now)));
  const [customTo, setCustomTo] = useState(toInputDate(now));

  useEffect(() => {
    api.get<LeadSummaryDTO[]>('/leads').then(setLeads).catch(() => setLeads([]));
    api.get<QuotationSummaryDTO[]>('/quotations').then((rows) => setQuotationCount(rows.length)).catch(() => setQuotationCount(null));
    api.get<BookingDTO[]>('/bookings').then(setBookings).catch(() => setBookings([]));
    if (user?.branchId) {
      api.get<BranchDTO[]>('/branches').then((rows) => setBranchName(rows.find((b) => b.id === user.branchId)?.name ?? null)).catch(() => undefined);
    }
    if (user?.role === Role.TRAVEL_CONSULTANT) {
      api.get<TargetDTO[]>(`/targets?scope=CONSULTANT&scopeId=${user.id}`).then((rows) => setTarget(rows[0] ?? null)).catch(() => undefined);
    } else if (user?.role === Role.BRANCH_MANAGER && user.branchId) {
      api.get<TargetDTO[]>(`/targets?scope=BRANCH&scopeId=${user.branchId}`).then((rows) => setTarget(rows[0] ?? null)).catch(() => undefined);
    } else if (user?.role === Role.DIRECTOR || user?.role === Role.ADMIN) {
      api.get<LeaderboardRowDTO[]>('/targets/leaderboard/company').then(setCompanyLeaderboard).catch(() => undefined);
    }
  }, [user]);

  const { rangeFrom, rangeTo, rangeLabel } = useMemo(() => {
    if (range === 'today') return { rangeFrom: startOfDay(now), rangeTo: endOfDay(now), rangeLabel: 'Today' };
    if (range === 'year') return { rangeFrom: startOfYear(now), rangeTo: endOfDay(now), rangeLabel: `${now.getFullYear()}` };
    if (range === 'custom') {
      return { rangeFrom: startOfDay(new Date(customFrom)), rangeTo: endOfDay(new Date(customTo)), rangeLabel: `${customFrom} → ${customTo}` };
    }
    return { rangeFrom: startOfMonth(now), rangeTo: endOfDay(now), rangeLabel: now.toLocaleString('en-IN', { month: 'long', year: 'numeric' }) };
  }, [range, customFrom, customTo, now]);

  const leadsInRange = useMemo(
    () => leads.filter((l) => { const c = new Date(l.createdAt); return c >= rangeFrom && c <= rangeTo; }),
    [leads, rangeFrom, rangeTo],
  );

  const bucketCounts = useMemo(() => {
    const counts: Record<Bucket, number> = { pending: 0, progress: 0, booked: 0, lost: 0 };
    leadsInRange.forEach((l) => { counts[STATUS_META[l.status].bucket] += 1; });
    return counts;
  }, [leadsInRange]);

  const statusCounts = useMemo(() => {
    const counts = new Map<LeadStatus, number>();
    leadsInRange.forEach((l) => counts.set(l.status, (counts.get(l.status) ?? 0) + 1));
    return Object.values(LeadStatus).map((s) => ({ status: s, count: counts.get(s) ?? 0 }));
  }, [leadsInRange]);

  const totalInRange = leadsInRange.length;

  const interestCounts = useMemo(() => {
    const counts = { hot: 0, warm: 0, cold: 0, junk: 0 };
    leads.forEach((l) => {
      if (l.status === LeadStatus.JUNK_NOT_INTERESTED || l.status === LeadStatus.PLAN_DROPPED) {
        counts.junk += 1;
      } else if (l.temperature === LeadTemperature.HOT) {
        counts.hot += 1;
      } else if (l.temperature === LeadTemperature.WARM) {
        counts.warm += 1;
      } else {
        counts.cold += 1;
      }
    });
    return counts;
  }, [leads]);

  const slaBreachedOpen = useMemo(() => leads.filter((l) => l.slaBreached && !CLOSED.includes(l.status)), [leads]);
  const followUpsDue = useMemo(() => leads.filter((l) => l.status === LeadStatus.FOLLOW_UP), [leads]);
  const hotLeads = useMemo(() => leads.filter((l) => l.status === LeadStatus.HOT_LEAD), [leads]);

  const upcomingDepartures = useMemo(() => {
    const in14 = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
    return bookings
      .filter((b) => b.status !== BookingStatus.CANCELLED && new Date(b.departureDate) >= now && new Date(b.departureDate) <= in14)
      .sort((a, b) => new Date(a.departureDate).getTime() - new Date(b.departureDate).getTime())
      .slice(0, 6);
  }, [bookings, now]);

  const bookingsInRange = useMemo(
    () => bookings.filter((b) => { const c = new Date(b.departureDate); return c >= rangeFrom && c <= rangeTo; }).length,
    [bookings, rangeFrom, rangeTo],
  );

  const conversionPct = totalInRange > 0 ? Math.round((bucketCounts.booked / totalInRange) * 1000) / 10 : 0;

  return (
    <AppShell>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="inline-block rounded-lg bg-gradient-to-r from-brand to-indigo-600 px-4 py-2 text-xl font-bold tracking-tight text-white shadow-card">
            Welcome, {user?.name}
          </h1>
          <p className="mt-1 text-sm text-blue-100">
            {user?.role.replaceAll('_', ' ')}
            {branchName ? ` · ${branchName} branch` : ''} — here&apos;s what&apos;s happening across your workspace right now.
          </p>
        </div>
      </div>

      <h2 className="mt-6 text-sm font-semibold text-white">
        {user?.role === Role.TRAVEL_CONSULTANT ? 'Leads assigned to you' : 'Your workspace at a glance'}
      </h2>
      <div className="mt-2 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Link href="/leads">
          <DashCard accent="cyan" label={user?.role === Role.TRAVEL_CONSULTANT ? 'Assigned to you' : 'Total leads'} value={leads.length.toString()} />
        </Link>
        <Link href="/quotations">
          <DashCard accent="orange" label="Quotations" value={quotationCount === null ? '—' : quotationCount.toString()} />
        </Link>
        <Link href="/bookings">
          <DashCard accent="pink" label="Bookings" value={bookings.length.toString()} />
        </Link>
      </div>

      <h2 className="mt-8 text-sm font-semibold text-white">How interested are they?</h2>
      <div className="mt-2 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <DashCard accent="red" label="🔥 Hot" value={interestCounts.hot.toString()} />
        <DashCard accent="amber" label="🌤 Warm" value={interestCounts.warm.toString()} />
        <DashCard accent="sky" label="❄️ Cold" value={interestCounts.cold.toString()} />
        <DashCard accent="slate" label="🗑 Junk / not interested" value={interestCounts.junk.toString()} />
      </div>

      <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-white">Lead status breakdown — {rangeLabel}</h2>
        <div className="flex flex-wrap items-center gap-2">
          {(['today', 'month', 'year', 'custom'] as RangeKey[]).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold shadow-card transition-colors ${
                range === r ? 'bg-brand-50 text-brand' : 'bg-white/20 text-white hover:bg-white/30'
              }`}
            >
              {r === 'today' ? 'Day' : r === 'month' ? 'Month' : r === 'year' ? 'Year' : 'Custom'}
            </button>
          ))}
          {range === 'custom' && (
            <div className="flex items-center gap-1.5 rounded-lg bg-brand-50 px-2 py-1 shadow-card">
              <input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} className="rounded-md border-none text-xs focus:outline-none focus:ring-2 focus:ring-brand-100" />
              <span className="text-xs text-slate-400">to</span>
              <input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} className="rounded-md border-none text-xs focus:outline-none focus:ring-2 focus:ring-brand-100" />
            </div>
          )}
        </div>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {(Object.keys(BUCKET_META) as Bucket[]).map((b) => (
          <div key={b} className={`rounded-xl bg-brand-50 p-4 shadow-card ring-1 ${BUCKET_META[b].ring} dark:bg-slate-800`}>
            <p className={`text-xs font-semibold uppercase tracking-wide ${BUCKET_META[b].text}`}>{BUCKET_META[b].label}</p>
            <p className="mt-1 text-2xl font-bold text-slate-800 dark:text-slate-100">{bucketCounts[b]}</p>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
              <div
                className={`h-full rounded-full bg-gradient-to-r ${BUCKET_META[b].gradient}`}
                style={{ width: totalInRange > 0 ? `${(bucketCounts[b] / totalInRange) * 100}%` : '0%' }}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 rounded-xl bg-brand-50 p-4 shadow-card dark:bg-slate-800">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Full status breakdown · {totalInRange} lead{totalInRange === 1 ? '' : 's'} · {conversionPct}% converted to bookings
          </p>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-3 lg:grid-cols-5">
          {statusCounts.map(({ status, count }) => (
            <div key={status} className="flex items-center gap-2">
              <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${STATUS_META[status].dot}`} />
              <span className="text-xs text-slate-600 dark:text-slate-300">{STATUS_META[status].label}</span>
              <span className="ml-auto text-xs font-semibold text-slate-800 dark:text-slate-100">{count}</span>
            </div>
          ))}
        </div>
      </div>

      <h2 className="mt-8 text-sm font-semibold text-white">Operations right now</h2>
      <div className="mt-2 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-xl bg-brand-50 p-4 shadow-card dark:bg-slate-800">
          <p className="text-xs font-semibold uppercase tracking-wide text-rose-600 dark:text-rose-400">SLA breached · needs attention</p>
          <p className="mt-1 text-2xl font-bold text-slate-800 dark:text-slate-100">{slaBreachedOpen.length}</p>
          <ul className="mt-2 space-y-1">
            {slaBreachedOpen.slice(0, 4).map((l) => (
              <li key={l.id}>
                <Link href={`/leads/${l.id}`} className="text-xs text-brand hover:underline">{l.clientName} — {l.destination}</Link>
              </li>
            ))}
            {slaBreachedOpen.length === 0 && <li className="text-xs text-slate-400">All caught up.</li>}
          </ul>
        </div>
        <div className="rounded-xl bg-brand-50 p-4 shadow-card dark:bg-slate-800">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-400">Follow-ups due · hot leads</p>
          <p className="mt-1 text-2xl font-bold text-slate-800 dark:text-slate-100">{followUpsDue.length} <span className="text-sm font-normal text-slate-400">/ {hotLeads.length} hot</span></p>
          <ul className="mt-2 space-y-1">
            {followUpsDue.slice(0, 4).map((l) => (
              <li key={l.id}>
                <Link href={`/leads/${l.id}`} className="text-xs text-brand hover:underline">{l.clientName} — {l.destination}</Link>
              </li>
            ))}
            {followUpsDue.length === 0 && <li className="text-xs text-slate-400">Nothing pending.</li>}
          </ul>
        </div>
        <div className="rounded-xl bg-brand-50 p-4 shadow-card dark:bg-slate-800">
          <p className="text-xs font-semibold uppercase tracking-wide text-teal-600 dark:text-teal-400">Departures in next 14 days</p>
          <p className="mt-1 text-2xl font-bold text-slate-800 dark:text-slate-100">{upcomingDepartures.length}</p>
          <ul className="mt-2 space-y-1">
            {upcomingDepartures.map((b) => (
              <li key={b.id}>
                <Link href="/bookings" className="text-xs text-brand hover:underline">
                  {b.quotation?.lead?.clientName ?? 'Booking'} — {new Date(b.departureDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                </Link>
              </li>
            ))}
            {upcomingDepartures.length === 0 && <li className="text-xs text-slate-400">None scheduled.</li>}
          </ul>
        </div>
      </div>

      {target && (user?.role === Role.TRAVEL_CONSULTANT || user?.role === Role.BRANCH_MANAGER) && (
        <>
          <h2 className="mt-8 text-sm font-semibold text-white">
            {user.role === Role.TRAVEL_CONSULTANT ? 'Your performance' : 'Your branch performance'} · {target.period.toLowerCase()}
          </h2>
          <div className="mt-2 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-xl bg-brand-50 p-4 shadow-card dark:bg-slate-800">
              <p className="text-xs font-semibold uppercase tracking-wide text-brand">Revenue achieved</p>
              <p className="mt-1 text-xl font-bold text-slate-800 dark:text-slate-100">
                ₹{target.revenueAchieved.toLocaleString('en-IN')} <span className="text-sm font-normal text-slate-400">/ ₹{target.revenueTarget.toLocaleString('en-IN')}</span>
              </p>
              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-brand to-indigo-500"
                  style={{ width: `${Math.min(100, target.revenueTarget > 0 ? (target.revenueAchieved / target.revenueTarget) * 100 : 0)}%` }}
                />
              </div>
            </div>
            <div className="rounded-xl bg-brand-50 p-4 shadow-card dark:bg-slate-800">
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">Bookings this period</p>
              <p className="mt-1 text-xl font-bold text-slate-800 dark:text-slate-100">
                {bookingsInRange} <span className="text-sm font-normal text-slate-400">/ {target.bookingTarget} target</span>
              </p>
              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500"
                  style={{ width: `${Math.min(100, target.bookingTarget > 0 ? (bookingsInRange / target.bookingTarget) * 100 : 0)}%` }}
                />
              </div>
            </div>
          </div>
        </>
      )}

      {companyLeaderboard.length > 0 && (user?.role === Role.DIRECTOR || user?.role === Role.ADMIN) && (
        <>
          <h2 className="mt-8 text-sm font-semibold text-white">Company performance by branch</h2>
          <div className="mt-2 overflow-hidden rounded-xl bg-brand-50 shadow-card dark:bg-slate-800">
            <table className="w-full text-sm">
              <thead className="bg-brand-50/60 text-left text-xs font-semibold uppercase tracking-wide text-brand-700 dark:bg-slate-700/50 dark:text-brand-200">
                <tr>
                  <th className="px-4 py-2">Branch</th>
                  <th className="px-4 py-2 text-right">Achieved</th>
                  <th className="px-4 py-2 text-right">Target</th>
                  <th className="px-4 py-2">Progress</th>
                </tr>
              </thead>
              <tbody>
                {companyLeaderboard.map((row) => (
                  <tr key={row.branchId} className="border-t border-slate-100 dark:border-slate-700">
                    <td className="px-4 py-2 font-medium text-slate-800 dark:text-slate-100">{row.name}</td>
                    <td className="px-4 py-2 text-right">₹{row.revenueAchieved.toLocaleString('en-IN')}</td>
                    <td className="px-4 py-2 text-right">₹{row.revenueTarget.toLocaleString('en-IN')}</td>
                    <td className="px-4 py-2">
                      <div className="h-2 w-32 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-brand to-indigo-500"
                          style={{ width: `${Math.min(100, row.revenueTarget > 0 ? (row.revenueAchieved / row.revenueTarget) * 100 : 0)}%` }}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <p className="mt-8 text-xs text-blue-100">
        Looking for revenue, margin, and branch targets? Head to <Link href="/reports" className="font-semibold text-white hover:underline">Reports</Link>.
      </p>
    </AppShell>
  );
}

const ACCENTS = {
  cyan: { border: 'border-t-cyan-500', text: 'text-cyan-600 dark:text-cyan-400' },
  orange: { border: 'border-t-orange-500', text: 'text-orange-600 dark:text-orange-400' },
  pink: { border: 'border-t-pink-500', text: 'text-pink-600 dark:text-pink-400' },
  red: { border: 'border-t-red-500', text: 'text-red-600 dark:text-red-400' },
  amber: { border: 'border-t-amber-500', text: 'text-amber-600 dark:text-amber-400' },
  sky: { border: 'border-t-sky-500', text: 'text-sky-600 dark:text-sky-400' },
  slate: { border: 'border-t-slate-400', text: 'text-slate-500 dark:text-slate-400' },
} as const;

function DashCard({ label, value, accent }: { label: string; value: string; accent: keyof typeof ACCENTS }) {
  const c = ACCENTS[accent];
  return (
    <div className={`overflow-hidden rounded-xl border-t-4 ${c.border} bg-brand-50 p-4 shadow-card transition-shadow hover:shadow-card-hover dark:bg-slate-800`}>
      <p className={`text-xs font-semibold uppercase tracking-wide ${c.text}`}>{label}</p>
      <p className="mt-1 text-xl font-bold text-slate-800 dark:text-slate-100">{value}</p>
    </div>
  );
}
