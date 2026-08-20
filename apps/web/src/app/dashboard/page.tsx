'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  Sparkles,
  PhoneOff,
  Send,
  Flame,
  FileCheck2,
  BellRing,
  PauseCircle,
  CheckCircle2,
  XCircle,
  Trash2,
  CalendarDays,
  Layers,
  MessageCircle,
  StickyNote,
  Wallet,
  Plane,
  MapPin,
  Users,
  Radar,
  type LucideIcon,
} from 'lucide-react';
import { AppShell } from '@/components/AppShell';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import {
  LeadStatus,
  LeadTemperature,
  Role,
  type DashboardOverviewDTO,
  type TargetDTO,
  type LeaderboardRowDTO,
  type MyLearningRowDTO,
  type LeadSummaryDTO,
  type BookingDTO,
} from '@holiday-vibez/shared';

type RangeKey = 'today' | 'month' | 'year' | 'custom';
type Bucket = 'pending' | 'progress' | 'booked' | 'lost';

const STATUS_META: Record<LeadStatus, { label: string; bucket: Bucket; icon: LucideIcon; tile: string }> = {
  [LeadStatus.NEW]: { label: 'New', bucket: 'pending', icon: Sparkles, tile: 'from-sky-500 to-sky-600' },
  [LeadStatus.NO_CONNECT]: { label: 'No Connect', bucket: 'pending', icon: PhoneOff, tile: 'from-slate-400 to-slate-500' },
  [LeadStatus.PROPOSAL_SENT]: { label: 'Proposal Sent', bucket: 'progress', icon: Send, tile: 'from-indigo-500 to-indigo-600' },
  [LeadStatus.HOT_LEAD]: { label: 'Hot Lead', bucket: 'progress', icon: Flame, tile: 'from-red-500 to-red-600' },
  [LeadStatus.PROPOSAL_CONFIRMED]: { label: 'Proposal Confirmed', bucket: 'progress', icon: FileCheck2, tile: 'from-teal-500 to-teal-600' },
  [LeadStatus.FOLLOW_UP]: { label: 'Follow Up', bucket: 'progress', icon: BellRing, tile: 'from-amber-500 to-amber-600' },
  [LeadStatus.POSTPONED]: { label: 'Postponed', bucket: 'progress', icon: PauseCircle, tile: 'from-purple-500 to-purple-600' },
  [LeadStatus.CONFIRMED]: { label: 'Confirmed', bucket: 'booked', icon: CheckCircle2, tile: 'from-emerald-500 to-emerald-600' },
  [LeadStatus.PLAN_DROPPED]: { label: 'Plan Dropped', bucket: 'lost', icon: XCircle, tile: 'from-rose-500 to-rose-600' },
  [LeadStatus.JUNK_NOT_INTERESTED]: { label: 'Junk / Not Interested', bucket: 'lost', icon: Trash2, tile: 'from-zinc-400 to-zinc-500' },
};

const BUCKET_META: Record<Bucket, { label: string; hex: string }> = {
  pending: { label: 'Pending / New', hex: '#0ea5e9' },
  progress: { label: 'Contacted / In progress', hex: '#f59e0b' },
  booked: { label: 'Booked', hex: '#10b981' },
  lost: { label: 'Lost', hex: '#f43f5e' },
};

const TEMPERATURE_DOT: Record<LeadTemperature, string> = {
  [LeadTemperature.HOT]: 'bg-red-500',
  [LeadTemperature.WARM]: 'bg-amber-500',
  [LeadTemperature.COLD]: 'bg-sky-500',
};

function startOfDay(d: Date) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; }
function endOfDay(d: Date) { const x = new Date(d); x.setHours(23, 59, 59, 999); return x; }
function startOfMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth(), 1); }
function startOfYear(d: Date) { return new Date(d.getFullYear(), 0, 1); }
function toInputDate(d: Date) { return d.toISOString().slice(0, 10); }
function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
}

const CLOSED = [LeadStatus.CONFIRMED, LeadStatus.PLAN_DROPPED, LeadStatus.JUNK_NOT_INTERESTED];

function SectionCard({ title, subtitle, action, children }: { title: string; subtitle?: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-card dark:border-slate-700 dark:bg-slate-800">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">{title}</h3>
          {subtitle && <p className="text-xs text-slate-400">{subtitle}</p>}
        </div>
        {action}
      </div>
      <div className="mt-3">{children}</div>
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [overview, setOverview] = useState<DashboardOverviewDTO | null>(null);
  const [leads, setLeads] = useState<LeadSummaryDTO[]>([]);
  const [bookings, setBookings] = useState<BookingDTO[]>([]);
  const [target, setTarget] = useState<TargetDTO | null>(null);
  const [companyLeaderboard, setCompanyLeaderboard] = useState<LeaderboardRowDTO[]>([]);
  const [myLearning, setMyLearning] = useState<MyLearningRowDTO[]>([]);
  const [range, setRange] = useState<RangeKey>('month');
  const now = useMemo(() => new Date(), []);
  const [customFrom, setCustomFrom] = useState(toInputDate(startOfMonth(now)));
  const [customTo, setCustomTo] = useState(toInputDate(now));

  useEffect(() => {
    api.get<DashboardOverviewDTO>('/dashboard/overview').then(setOverview).catch(() => setOverview(null));
    api.get<LeadSummaryDTO[]>('/leads').then(setLeads).catch(() => setLeads([]));
    api.get<BookingDTO[]>('/bookings').then(setBookings).catch(() => setBookings([]));
    if (user?.role === Role.TRAVEL_CONSULTANT) {
      api.get<TargetDTO[]>(`/targets?scope=CONSULTANT&scopeId=${user.id}`).then((rows) => setTarget(rows[0] ?? null)).catch(() => undefined);
    } else if (user?.role === Role.BRANCH_MANAGER && user.branchId) {
      api.get<TargetDTO[]>(`/targets?scope=BRANCH&scopeId=${user.branchId}`).then((rows) => setTarget(rows[0] ?? null)).catch(() => undefined);
    } else if (user?.role === Role.DIRECTOR || user?.role === Role.ADMIN) {
      api.get<LeaderboardRowDTO[]>('/targets/leaderboard/company').then(setCompanyLeaderboard).catch(() => undefined);
    }
    if (user?.role === Role.TRAVEL_CONSULTANT || user?.role === Role.BRANCH_MANAGER) {
      api.get<MyLearningRowDTO[]>('/lms/me/learning').then(setMyLearning).catch(() => undefined);
    }
  }, [user]);

  const { rangeFrom, rangeTo, rangeLabel } = useMemo(() => {
    if (range === 'today') return { rangeFrom: startOfDay(now), rangeTo: endOfDay(now), rangeLabel: 'Today' };
    if (range === 'year') return { rangeFrom: startOfYear(now), rangeTo: endOfDay(now), rangeLabel: `${now.getFullYear()}` };
    if (range === 'custom') return { rangeFrom: startOfDay(new Date(customFrom)), rangeTo: endOfDay(new Date(customTo)), rangeLabel: `${customFrom} → ${customTo}` };
    return { rangeFrom: startOfMonth(now), rangeTo: endOfDay(now), rangeLabel: now.toLocaleString('en-IN', { month: 'long', year: 'numeric' }) };
  }, [range, customFrom, customTo, now]);

  const leadsInRange = useMemo(() => leads.filter((l) => { const c = new Date(l.createdAt); return c >= rangeFrom && c <= rangeTo; }), [leads, rangeFrom, rangeTo]);

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
  const conversionPct = totalInRange > 0 ? Math.round((bucketCounts.booked / totalInRange) * 1000) / 10 : 0;

  const slaBreachedOpen = useMemo(() => leads.filter((l) => l.slaBreached && !CLOSED.includes(l.status)), [leads]);
  const followUpsDue = useMemo(() => leads.filter((l) => l.status === LeadStatus.FOLLOW_UP), [leads]);
  const hotLeads = useMemo(() => leads.filter((l) => l.status === LeadStatus.HOT_LEAD), [leads]);

  const upcomingDepartures14 = useMemo(() => {
    const in14 = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
    return bookings
      .filter((b) => b.status !== 'CANCELLED' && new Date(b.departureDate) >= now && new Date(b.departureDate) <= in14)
      .sort((a, b) => new Date(a.departureDate).getTime() - new Date(b.departureDate).getTime())
      .slice(0, 6);
  }, [bookings, now]);

  const bookingsInRange = useMemo(() => bookings.filter((b) => { const c = new Date(b.departureDate); return c >= rangeFrom && c <= rangeTo; }).length, [bookings, rangeFrom, rangeTo]);

  const queryStageData = overview?.queryStages.map((s) => ({ ...s, label: BUCKET_META[s.bucket].label, hex: BUCKET_META[s.bucket].hex })) ?? [];

  return (
    <AppShell>
      <div className="rounded-3xl bg-gradient-to-br from-brand-700 via-brand-600 to-brand-500 p-6 text-white shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight">Welcome back, {user?.name?.split(' ')[0]} 👋</h1>
            <p className="mt-1 text-sm text-blue-100">Here&apos;s your business overview — {user?.role.replaceAll('_', ' ').toLowerCase()}.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {(['today', 'month', 'year', 'custom'] as RangeKey[]).map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${range === r ? 'bg-white text-brand-700' : 'bg-white/10 text-white hover:bg-white/20'}`}
              >
                {r === 'today' ? 'Day' : r === 'month' ? 'Month' : r === 'year' ? 'Year' : 'Custom'}
              </button>
            ))}
            {range === 'custom' && (
              <div className="flex items-center gap-1.5 rounded-lg bg-white px-2 py-1">
                <input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} className="rounded-md border-none text-xs text-slate-700 focus:outline-none" />
                <span className="text-xs text-slate-400">to</span>
                <input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} className="rounded-md border-none text-xs text-slate-700 focus:outline-none" />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Status cards — Today's/Total Queries + one card per status */}
      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <StatusCard label="Today's Queries" value={overview?.todaysQueries} icon={CalendarDays} tile="from-brand-500 to-brand-600" href="/leads" />
        <StatusCard label="Total Queries" value={overview?.totalQueries} icon={Layers} tile="from-slate-500 to-slate-600" href="/leads" />
        {Object.values(LeadStatus).map((status) => {
          const meta = STATUS_META[status];
          const card = overview?.statusCards.find((c) => c.status === status);
          return (
            <StatusCard
              key={status}
              label={meta.label}
              value={card?.total}
              subValue={card ? `${card.today} today` : undefined}
              icon={meta.icon}
              tile={meta.tile}
              href={`/leads?status=${status}`}
            />
          );
        })}
      </div>

      {/* WhatsApp Messages + Reminders */}
      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SectionCard title="WhatsApp Messages" subtitle="Recent 48 hour client replies and interactions" action={<MessageCircle className="h-4 w-4 text-emerald-500" />}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                <tr><th className="pb-2">Client</th><th className="pb-2">Message</th><th className="pb-2">Status</th><th className="pb-2 text-right">When</th></tr>
              </thead>
              <tbody>
                {overview?.whatsappRecent.map((m) => (
                  <tr key={m.id} className="border-t border-slate-100 dark:border-slate-700">
                    <td className="py-2 pr-2">
                      <div className="flex items-center gap-1.5">
                        <span className={`h-2 w-2 shrink-0 rounded-full ${TEMPERATURE_DOT[m.temperature]}`} />
                        <span className="font-medium text-slate-700 dark:text-slate-200">{m.clientName}</span>
                      </div>
                    </td>
                    <td className="py-2 pr-2 max-w-[220px] truncate text-slate-500 dark:text-slate-400">{m.body}</td>
                    <td className="py-2 pr-2 text-xs text-slate-500">{STATUS_META[m.status].label}</td>
                    <td className="py-2 text-right text-xs text-slate-400">{timeAgo(m.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {(!overview || overview.whatsappRecent.length === 0) && <p className="py-6 text-center text-sm text-slate-400">No recent client replies.</p>}
          </div>
        </SectionCard>

        <SectionCard title="Reminders" subtitle="Upcoming tasks and followups" action={<BellRing className="h-4 w-4 text-amber-500" />}>
          <ul className="max-h-72 space-y-2 overflow-y-auto">
            {overview?.reminders.map((r) => (
              <li key={r.id} className={`flex items-start justify-between gap-2 rounded-xl border p-2.5 ${r.overdue ? 'border-rose-200 bg-rose-50 dark:border-rose-900 dark:bg-rose-950/30' : 'border-slate-100 dark:border-slate-700'}`}>
                <div className="min-w-0">
                  <p className="truncate text-sm text-slate-700 dark:text-slate-200">
                    <Link href={`/leads/${r.leadId}`} className="font-medium text-brand hover:underline">{r.clientName}</Link> — {r.note}
                  </p>
                  <p className="text-xs text-slate-400">{new Date(r.dueAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })} · {r.assignedToName}</p>
                </div>
                {r.overdue && <span className="shrink-0 rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold uppercase text-rose-700 dark:bg-rose-900 dark:text-rose-300">Overdue</span>}
              </li>
            ))}
            {(!overview || overview.reminders.length === 0) && <li className="py-6 text-center text-sm text-slate-400">Nothing due — all caught up.</li>}
          </ul>
        </SectionCard>
      </div>

      {/* This Year Queries, Query Stages, Payment Collection */}
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <SectionCard title="This Year Queries" subtitle="Monthly performance of total vs confirmed queries">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={overview?.monthlyQueries ?? []} barGap={2}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="month" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="total" name="Total" fill="#93c5fd" radius={[4, 4, 0, 0]} />
                <Bar dataKey="confirmed" name="Confirmed" fill="#005aaa" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>

        <SectionCard title="Query Stages" subtitle="Distribution of queries by status">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={queryStageData} dataKey="count" nameKey="label" innerRadius={55} outerRadius={85} paddingAngle={2}>
                  {queryStageData.map((s) => <Cell key={s.bucket} fill={s.hex} />)}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} formatter={(v, n) => [`${v}`, `${n}`]} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>

        <SectionCard title="Payment Collection" subtitle="Pending and scheduled payments" action={<Wallet className="h-4 w-4 text-emerald-500" />}>
          <ul className="max-h-64 space-y-2 overflow-y-auto">
            {overview?.paymentCollection.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-2 rounded-xl border border-slate-100 p-2.5 dark:border-slate-700">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-700 dark:text-slate-200">{p.clientName}</p>
                  <p className="text-xs text-slate-400">{p.dueDate ? new Date(p.dueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : 'No due date'}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="text-sm font-bold text-slate-800 dark:text-slate-100">₹{p.amount.toLocaleString('en-IN')}</span>
                  {p.overdue && <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold uppercase text-rose-700 dark:bg-rose-900 dark:text-rose-300">Overdue</span>}
                </div>
              </li>
            ))}
            {(!overview || overview.paymentCollection.length === 0) && <li className="py-6 text-center text-sm text-slate-400">Nothing pending.</li>}
          </ul>
        </SectionCard>
      </div>

      {/* Upcoming Tours, Notes, Top Destinations */}
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <SectionCard title="Upcoming Tours" subtitle="Departures in the next 30 days" action={<Plane className="h-4 w-4 text-brand" />}>
          <ul className="max-h-64 space-y-2 overflow-y-auto">
            {overview?.upcomingTours.map((t) => (
              <li key={t.id} className="flex items-center justify-between gap-2 rounded-xl border border-slate-100 p-2.5 dark:border-slate-700">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-700 dark:text-slate-200">{t.clientName}</p>
                  <p className="text-xs text-slate-400">{t.destination}</p>
                </div>
                <span className="shrink-0 text-xs font-semibold text-brand">{new Date(t.departureDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</span>
              </li>
            ))}
            {(!overview || overview.upcomingTours.length === 0) && <li className="py-6 text-center text-sm text-slate-400">No tours in the next 30 days.</li>}
          </ul>
        </SectionCard>

        <SectionCard title="Notes" subtitle="Latest query notes and updates" action={<StickyNote className="h-4 w-4 text-amber-500" />}>
          <ul className="max-h-64 space-y-2 overflow-y-auto">
            {overview?.notes.map((n) => (
              <li key={n.id} className="rounded-xl border border-slate-100 p-2.5 dark:border-slate-700">
                <div className="flex items-center justify-between gap-2">
                  <Link href={`/leads/${n.leadId}`} className="text-sm font-medium text-brand hover:underline">{n.clientName}</Link>
                  <span className="shrink-0 text-xs text-slate-400">{timeAgo(n.createdAt)}</span>
                </div>
                <p className="mt-0.5 truncate text-sm text-slate-600 dark:text-slate-300">{n.body}</p>
              </li>
            ))}
            {(!overview || overview.notes.length === 0) && <li className="py-6 text-center text-sm text-slate-400">No notes logged yet.</li>}
          </ul>
        </SectionCard>

        <SectionCard title="Top Destinations" subtitle="Most popular travel locations" action={<MapPin className="h-4 w-4 text-rose-500" />}>
          <ol className="space-y-1.5">
            {overview?.topDestinations.map((d, i) => (
              <li key={d.destination} className="flex items-center justify-between text-sm">
                <span className="text-slate-600 dark:text-slate-300">{i + 1}. {d.destination}</span>
                <span className="font-semibold text-slate-800 dark:text-slate-100">{d.count}</span>
              </li>
            ))}
            {(!overview || overview.topDestinations.length === 0) && <li className="py-6 text-center text-sm text-slate-400">No leads yet.</li>}
          </ol>
        </SectionCard>
      </div>

      {/* Sales Representative, Top Lead Source, Financial Summary */}
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <SectionCard title="Sales Representative" subtitle="Assigned vs confirmed performance" action={<Users className="h-4 w-4 text-brand" />}>
          <div className="max-h-64 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                <tr><th className="pb-2">Name</th><th className="pb-2 text-right">Assigned</th><th className="pb-2 text-right">Confirmed</th></tr>
              </thead>
              <tbody>
                {overview?.salesRepresentative.map((r, i) => (
                  <tr key={r.consultantId} className="border-t border-slate-100 dark:border-slate-700">
                    <td className="py-1.5 text-slate-700 dark:text-slate-200">{i + 1}. {r.name}</td>
                    <td className="py-1.5 text-right text-slate-500">{r.assigned}</td>
                    <td className="py-1.5 text-right font-semibold text-emerald-600 dark:text-emerald-400">{r.confirmed}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {(!overview || overview.salesRepresentative.length === 0) && <p className="py-6 text-center text-sm text-slate-400">No assigned leads yet.</p>}
          </div>
        </SectionCard>

        <SectionCard title="Top Lead Source" subtitle="Highest performing lead channel" action={<Radar className="h-4 w-4 text-indigo-500" />}>
          <div className="max-h-64 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                <tr><th className="pb-2">Source</th><th className="pb-2 text-right">Total</th><th className="pb-2 text-right">Confirmed</th><th className="pb-2 text-right">Lost</th></tr>
              </thead>
              <tbody>
                {overview?.topLeadSource.map((s) => (
                  <tr key={s.source} className="border-t border-slate-100 dark:border-slate-700">
                    <td className="py-1.5 text-slate-700 dark:text-slate-200">{s.source.replaceAll('_', ' ')}</td>
                    <td className="py-1.5 text-right text-slate-500">{s.total}</td>
                    <td className="py-1.5 text-right"><span className="rounded bg-emerald-100 px-1.5 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300">{s.confirmed}</span></td>
                    <td className="py-1.5 text-right"><span className="rounded bg-rose-100 px-1.5 py-0.5 text-xs font-semibold text-rose-700 dark:bg-rose-900 dark:text-rose-300">{s.lost}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {(!overview || overview.topLeadSource.length === 0) && <p className="py-6 text-center text-sm text-slate-400">No leads yet.</p>}
          </div>
        </SectionCard>

        <SectionCard title="Financial Summary" subtitle="Monthly collected revenue this year">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={overview?.financialSummary ?? []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="month" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${Math.round(v / 1000)}k`} />
                <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} formatter={(v) => [`₹${Number(v).toLocaleString('en-IN')}`, 'Revenue']} />
                <Line type="monotone" dataKey="revenue" stroke="#005aaa" strokeWidth={2.5} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>
      </div>

      {/* Existing operational widgets — date-range breakdown, SLA/follow-up ops, targets, training, company leaderboard */}
      <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-brand-700 dark:text-slate-100">Lead status breakdown — {rangeLabel}</h2>
      </div>
      <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {(Object.keys(BUCKET_META) as Bucket[]).map((b) => (
          <div key={b} className="rounded-xl bg-white p-4 shadow-card dark:bg-slate-800">
            <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: BUCKET_META[b].hex }}>{BUCKET_META[b].label}</p>
            <p className="mt-1 text-2xl font-bold text-slate-800 dark:text-slate-100">{bucketCounts[b]}</p>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
              <div className="h-full rounded-full" style={{ width: totalInRange > 0 ? `${(bucketCounts[b] / totalInRange) * 100}%` : '0%', backgroundColor: BUCKET_META[b].hex }} />
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 rounded-xl bg-white p-4 shadow-card dark:bg-slate-800">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Full status breakdown · {totalInRange} lead{totalInRange === 1 ? '' : 's'} · {conversionPct}% converted to bookings
        </p>
        <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-3 lg:grid-cols-5">
          {statusCounts.map(({ status, count }) => (
            <div key={status} className="flex items-center gap-2">
              <span className={`h-2.5 w-2.5 shrink-0 rounded-full bg-gradient-to-br ${STATUS_META[status].tile}`} />
              <span className="text-xs text-slate-600 dark:text-slate-300">{STATUS_META[status].label}</span>
              <span className="ml-auto text-xs font-semibold text-slate-800 dark:text-slate-100">{count}</span>
            </div>
          ))}
        </div>
      </div>

      <h2 className="mt-8 text-sm font-semibold text-brand-700 dark:text-slate-100">Operations right now</h2>
      <div className="mt-2 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-xl bg-white p-4 shadow-card dark:bg-slate-800">
          <p className="text-xs font-semibold uppercase tracking-wide text-rose-600 dark:text-rose-400">SLA breached · needs attention</p>
          <p className="mt-1 text-2xl font-bold text-slate-800 dark:text-slate-100">{slaBreachedOpen.length}</p>
          <ul className="mt-2 space-y-1">
            {slaBreachedOpen.slice(0, 4).map((l) => (
              <li key={l.id}><Link href={`/leads/${l.id}`} className="text-xs text-brand hover:underline">{l.clientName} — {l.destination}</Link></li>
            ))}
            {slaBreachedOpen.length === 0 && <li className="text-xs text-slate-400">All caught up.</li>}
          </ul>
        </div>
        <div className="rounded-xl bg-white p-4 shadow-card dark:bg-slate-800">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-400">Follow-ups due · hot leads</p>
          <p className="mt-1 text-2xl font-bold text-slate-800 dark:text-slate-100">{followUpsDue.length} <span className="text-sm font-normal text-slate-400">/ {hotLeads.length} hot</span></p>
          <ul className="mt-2 space-y-1">
            {followUpsDue.slice(0, 4).map((l) => (
              <li key={l.id}><Link href={`/leads/${l.id}`} className="text-xs text-brand hover:underline">{l.clientName} — {l.destination}</Link></li>
            ))}
            {followUpsDue.length === 0 && <li className="text-xs text-slate-400">Nothing pending.</li>}
          </ul>
        </div>
        <div className="rounded-xl bg-white p-4 shadow-card dark:bg-slate-800">
          <p className="text-xs font-semibold uppercase tracking-wide text-teal-600 dark:text-teal-400">Departures in next 14 days</p>
          <p className="mt-1 text-2xl font-bold text-slate-800 dark:text-slate-100">{upcomingDepartures14.length}</p>
          <ul className="mt-2 space-y-1">
            {upcomingDepartures14.map((b) => (
              <li key={b.id}>
                <Link href="/bookings" className="text-xs text-brand hover:underline">
                  {b.quotation?.lead?.clientName ?? 'Booking'} — {new Date(b.departureDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                </Link>
              </li>
            ))}
            {upcomingDepartures14.length === 0 && <li className="text-xs text-slate-400">None scheduled.</li>}
          </ul>
        </div>
      </div>

      {target && (user?.role === Role.TRAVEL_CONSULTANT || user?.role === Role.BRANCH_MANAGER) && (
        <>
          <h2 className="mt-8 text-sm font-semibold text-brand-700 dark:text-slate-100">
            {user.role === Role.TRAVEL_CONSULTANT ? 'Your performance' : 'Your branch performance'} · {target.period.toLowerCase()}
          </h2>
          <div className="mt-2 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-xl bg-white p-4 shadow-card dark:bg-slate-800">
              <p className="text-xs font-semibold uppercase tracking-wide text-brand">Revenue achieved</p>
              <p className="mt-1 text-xl font-bold text-slate-800 dark:text-slate-100">
                ₹{target.revenueAchieved.toLocaleString('en-IN')} <span className="text-sm font-normal text-slate-400">/ ₹{target.revenueTarget.toLocaleString('en-IN')}</span>
              </p>
              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
                <div className="h-full rounded-full bg-gradient-to-r from-brand-600 to-brand-400" style={{ width: `${Math.min(100, target.revenueTarget > 0 ? (target.revenueAchieved / target.revenueTarget) * 100 : 0)}%` }} />
              </div>
            </div>
            <div className="rounded-xl bg-white p-4 shadow-card dark:bg-slate-800">
              <p className="text-xs font-semibold uppercase tracking-wide text-brand-500 dark:text-brand-300">Bookings this period</p>
              <p className="mt-1 text-xl font-bold text-slate-800 dark:text-slate-100">
                {bookingsInRange} <span className="text-sm font-normal text-slate-400">/ {target.bookingTarget} target</span>
              </p>
              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
                <div className="h-full rounded-full bg-gradient-to-r from-brand-400 to-brand-200" style={{ width: `${Math.min(100, target.bookingTarget > 0 ? (bookingsInRange / target.bookingTarget) * 100 : 0)}%` }} />
              </div>
            </div>
          </div>
        </>
      )}

      {(user?.role === Role.TRAVEL_CONSULTANT || user?.role === Role.BRANCH_MANAGER) && myLearning.length > 0 && (
        <>
          <h2 className="mt-8 text-sm font-semibold text-brand-700 dark:text-slate-100">Training & certification</h2>
          <div className="mt-2 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-xl bg-white p-4 shadow-card dark:bg-slate-800">
              <p className="text-xs font-semibold uppercase tracking-wide text-brand">Courses completed</p>
              <p className="mt-1 text-xl font-bold text-slate-800 dark:text-slate-100">{myLearning.filter((c) => c.completedAt).length} <span className="text-sm font-normal text-slate-400">/ {myLearning.length} enrolled</span></p>
            </div>
            <div className="rounded-xl bg-white p-4 shadow-card dark:bg-slate-800">
              <p className="text-xs font-semibold uppercase tracking-wide text-brand-500 dark:text-brand-300">Certificates earned</p>
              <p className="mt-1 text-xl font-bold text-slate-800 dark:text-slate-100">{myLearning.filter((c) => c.certificate).length}</p>
            </div>
            <div className="rounded-xl bg-white p-4 shadow-card dark:bg-slate-800">
              <p className="text-xs font-semibold uppercase tracking-wide text-brand-700 dark:text-brand-200">In progress</p>
              <p className="mt-1 text-xl font-bold text-slate-800 dark:text-slate-100">{myLearning.filter((c) => !c.completedAt).length}</p>
              <Link href="/lms/my-learning" className="mt-1 inline-block text-xs text-brand hover:underline">View my learning →</Link>
            </div>
          </div>
        </>
      )}

      {companyLeaderboard.length > 0 && (user?.role === Role.DIRECTOR || user?.role === Role.ADMIN) && (
        <>
          <h2 className="mt-8 text-sm font-semibold text-brand-700 dark:text-slate-100">Company performance by branch</h2>
          <div className="mt-2 overflow-hidden rounded-xl bg-white shadow-card dark:bg-slate-800">
            <table className="w-full text-sm">
              <thead className="bg-brand-50/60 text-left text-xs font-semibold uppercase tracking-wide text-brand-700 dark:bg-slate-700/50 dark:text-brand-200">
                <tr><th className="px-4 py-2">Branch</th><th className="px-4 py-2 text-right">Achieved</th><th className="px-4 py-2 text-right">Target</th><th className="px-4 py-2">Progress</th></tr>
              </thead>
              <tbody>
                {companyLeaderboard.map((row) => (
                  <tr key={row.branchId} className="border-t border-slate-100 dark:border-slate-700">
                    <td className="px-4 py-2 font-medium text-slate-800 dark:text-slate-100">{row.name}</td>
                    <td className="px-4 py-2 text-right">₹{row.revenueAchieved.toLocaleString('en-IN')}</td>
                    <td className="px-4 py-2 text-right">₹{row.revenueTarget.toLocaleString('en-IN')}</td>
                    <td className="px-4 py-2">
                      <div className="h-2 w-32 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
                        <div className="h-full rounded-full bg-gradient-to-r from-brand-600 to-brand-400" style={{ width: `${Math.min(100, row.revenueTarget > 0 ? (row.revenueAchieved / row.revenueTarget) * 100 : 0)}%` }} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <p className="mt-8 text-xs text-slate-500 dark:text-slate-400">
        Looking for revenue, margin, and branch targets? Head to <Link href="/reports" className="font-semibold text-brand hover:underline">Reports</Link>.
      </p>
    </AppShell>
  );
}

function StatusCard({ label, value, subValue, icon: Icon, tile, href }: { label: string; value: number | undefined; subValue?: string; icon: LucideIcon; tile: string; href: string }) {
  return (
    <Link href={href} className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white p-3.5 shadow-card transition-all hover:-translate-y-0.5 hover:shadow-card-hover dark:border-slate-700 dark:bg-slate-800">
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${tile} text-white`}>
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <p className="text-xs font-semibold leading-tight text-slate-500 dark:text-slate-400">{label}</p>
        <p className="text-lg font-extrabold text-slate-900 dark:text-slate-100">{value ?? '—'}</p>
        {subValue && <p className="text-[10px] text-slate-400">{subValue}</p>}
      </div>
    </Link>
  );
}
