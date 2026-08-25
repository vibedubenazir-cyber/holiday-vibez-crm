'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  UserPlus,
  Inbox as InboxIcon,
  FileText,
  CheckCircle2,
  Users,
  Trophy,
  Package,
  Calendar,
  CalendarDays,
  Briefcase,
  Building2,
  LifeBuoy,
  MessageSquare,
  Megaphone,
  Globe,
  LayoutTemplate,
  Zap,
  UserCog,
  Building,
  Tags,
  SlidersHorizontal,
  HardDrive,
  Database,
  ShieldCheck,
  CalendarCheck,
  Plane,
  Wallet,
  ClipboardList,
  Receipt,
  BarChart3,
  ArrowLeftRight,
  Ticket,
  Truck,
  Landmark,
  PiggyBank,
  PieChart,
  Scale,
  Percent,
  GraduationCap,
  Award,
  UserCheck,
  ClipboardCheck,
  IdCard,
  HandCoins,
  TrendingUp,
  LogOut,
  Circle,
  Settings,
  KeySquare,
  CalendarClock,
  HelpCircle,
  ShieldAlert,
  History,
  MapPin,
  Menu,
  X,
  type LucideIcon,
} from 'lucide-react';
import { Role } from '@holiday-vibez/shared';
import { useAuth } from '@/lib/auth-context';
import { FloatingChatWidget } from './FloatingChatWidget';
import { MODULES, getSelectedModule, moduleForPath, setSelectedModule, type ModuleId, type NavItem } from '@/lib/modules';

const ROLE_LABELS: Record<string, string> = {
  DIRECTOR: 'Director',
  ADMIN: 'Admin',
  BRANCH_MANAGER: 'Branch Manager',
  TRAVEL_CONSULTANT: 'Travel Consultant',
  FINANCE: 'Finance',
  AUDITOR: 'Auditor',
};

// One icon per route across every module's sidebar.
const NAV_ICONS: Record<string, LucideIcon> = {
  '/holidays': CalendarDays,
  '/assets': Briefcase,
  '/onboarding': UserCheck,
  '/roster': CalendarCheck,
  '/appraisals': Award,
  '/employee-documents': ClipboardList,
  '/dashboard': LayoutDashboard,
  '/leads': UserPlus,
  '/inbox': InboxIcon,
  '/quotations': FileText,
  '/approvals': CheckCircle2,
  '/clients': Users,
  '/targets': Trophy,
  '/packages': Package,
  '/calendar': Calendar,
  '/hotel-masters': Building2,
  '/itineraries': MapPin,
  '/support': LifeBuoy,
  '/team-chat': MessageSquare,
  '/marketing': Megaphone,
  '/cms': Globe,
  '/templates': LayoutTemplate,
  '/automation': Zap,
  '/admin/users': UserCog,
  '/admin/branches': Building,
  '/admin/rates': Tags,
  '/custom-fields': SlidersHorizontal,
  '/storage': HardDrive,
  '/data-admin': Database,
  '/security': ShieldCheck,
  '/employees': IdCard,
  '/attendance': CalendarCheck,
  '/leave': Plane,
  '/payroll': Wallet,
  '/reimbursements': HandCoins,
  '/performance': TrendingUp,
  '/exit-management': LogOut,
  '/hr-settings': Settings,
  '/permissions': KeySquare,
  '/compliance-calendar': CalendarClock,
  '/hr-helpdesk': HelpCircle,
  '/grievances': ShieldAlert,
  '/hr-audit-log': History,
  '/bookings': ClipboardList,
  '/expenses': Receipt,
  '/reports': BarChart3,
  '/currency': ArrowLeftRight,
  '/coupons': Ticket,
  '/suppliers': Truck,
  '/accounts': Landmark,
  '/petty-cash': PiggyBank,
  '/budgets': PieChart,
  '/bank-reconciliation': Scale,
  '/dmc-commissions': Percent,
  '/lms': GraduationCap,
  '/lms/my-learning': Award,
  '/lms/assign': UserCheck,
  '/lms/reports': ClipboardCheck,
};

function navIcon(href: string): LucideIcon {
  return NAV_ICONS[href] ?? Circle;
}

// Soft tinted chip behind every nav icon — the accent follows the ROUTE (hash
// of the href), not its position, so an item keeps its colour regardless of
// which role's filtering hides its neighbours. Palette is the CVD-validated
// accent set from the approved design proposal.
const CHIP_TINTS = [
  'bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-sm shadow-blue-200',
  'bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-sm shadow-emerald-200',
  'bg-gradient-to-br from-violet-500 to-violet-600 text-white shadow-sm shadow-violet-200',
  'bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-sm shadow-amber-200',
  'bg-gradient-to-br from-rose-500 to-rose-600 text-white shadow-sm shadow-rose-200',
  'bg-gradient-to-br from-sky-400 to-sky-500 text-white shadow-sm shadow-sky-200',
] as const;

function chipTint(href: string): string {
  let hash = 0;
  for (const ch of href) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return CHIP_TINTS[hash % CHIP_TINTS.length];
}

function initials(name: string) {
  return name
    .split(' ')
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [moduleId, setModuleId] = useState<ModuleId | null>(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [loading, user, router]);

  useEffect(() => {
    // The route is authoritative — a bookmark, shared link, or browser
    // back/forward into a different module's page must show that module's
    // sidebar, not whatever localStorage last remembered from the picker.
    const fromPath = moduleForPath(pathname);
    if (fromPath) {
      setModuleId(fromPath);
      setSelectedModule(fromPath);
      return;
    }
    setModuleId(getSelectedModule() ?? 'CRM');
  }, [pathname]);

  // A nav click on mobile should close the drawer — otherwise it stays open
  // over the newly-navigated page since it isn't unmounted, just repositioned.
  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

  if (loading || !user || !moduleId) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-slate-500">Loading...</p>
      </div>
    );
  }

  const activeModule = MODULES.find((m) => m.id === moduleId) ?? MODULES[0];

  const visibleGroups = activeModule.groups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => item.roles.includes(user.role as Role)),
    }))
    .filter((group) => group.items.length > 0);

  function navLink(item: NavItem) {
    const active = pathname === item.href;
    const Icon = navIcon(item.href);
    return (
      <Link
        key={item.href}
        href={item.href}
        className={`relative flex items-center gap-2.5 rounded-xl px-2.5 py-1.5 text-sm font-medium transition-all ${
          active
            ? 'bg-gradient-to-br from-brand-600 to-brand-500 text-white shadow-lg shadow-brand-500/25'
            : 'text-brand-700/80 hover:bg-white hover:text-brand-700'
        }`}
      >
        <span
          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors ${
            active ? 'bg-white/15 text-white' : chipTint(item.href)
          }`}
        >
          <Icon className="h-4 w-4" />
        </span>
        {item.label}
      </Link>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Signature accent — a thin ribbon of the full accent palette across the top. */}
      <div className="pointer-events-none fixed inset-x-0 top-0 z-50 h-1 bg-[linear-gradient(90deg,#005aaa,#7c3aed,#e11d48,#d97706,#059669)]" />

      {/* Backdrop — mobile only, closes the drawer on tap outside it. */}
      {mobileNavOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          onClick={() => setMobileNavOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 shrink-0 flex-col overflow-y-auto border-r border-brand-200/60 bg-gradient-to-b from-brand-50 to-brand-100 transition-transform duration-200 ease-out lg:static lg:z-auto lg:translate-x-0 ${
          mobileNavOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between px-5 pb-3 pt-5">
          <Image src="/logo.png" alt="Holiday Vibez" width={140} height={35} className="h-auto w-32" priority />
          <button
            onClick={() => setMobileNavOpen(false)}
            className="rounded-lg p-1 text-brand-700/70 hover:bg-white lg:hidden"
            aria-label="Close navigation"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="px-5">
          <span className="inline-block rounded-full bg-gradient-to-r from-brand-600 to-violet-600 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-white shadow-sm">
            {activeModule.label}
          </span>
        </div>
        <nav className="flex flex-1 flex-col gap-0.5 p-3">
          {visibleGroups.map((group, i) => (
            <div key={group.title ?? 'top'} className={i > 0 ? 'mt-4' : undefined}>
              {group.title && (
                <p className="mb-1 px-3 text-[10px] font-bold uppercase tracking-wider text-brand-500/70">{group.title}</p>
              )}
              <div className="flex flex-col gap-0.5">{group.items.map(navLink)}</div>
            </div>
          ))}
        </nav>
      </aside>
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-brand-200/60 bg-gradient-to-r from-brand-50 to-brand-100 px-3 py-2.5 sm:px-6">
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => setMobileNavOpen(true)}
              className="rounded-lg p-1.5 text-brand-700 hover:bg-white lg:hidden"
              aria-label="Open navigation"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-600 to-brand-400 text-xs font-bold text-white shadow-md shadow-brand-500/25">
              {initials(user.name)}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-brand-700">{user.name}</p>
              <p className="truncate text-[11px] font-medium text-slate-400">{ROLE_LABELS[user.role] ?? user.role}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/modules"
              className="rounded-xl border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 transition hover:border-brand-200 hover:bg-brand-50 hover:text-brand sm:px-3 sm:text-sm"
            >
              Modules
            </Link>
            <button
              onClick={() => logout()}
              className="rounded-xl border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 sm:px-3 sm:text-sm"
            >
              Sign out
            </button>
          </div>
        </header>
        <main className="flex-1 overflow-x-auto overflow-y-auto bg-brand-100 p-3 dark:bg-slate-950 sm:p-6">{children}</main>
      </div>
      <FloatingChatWidget />
    </div>
  );
}
