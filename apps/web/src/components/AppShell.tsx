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
  Building2,
  Route as RouteIcon,
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
  Circle,
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

// Deterministic per-item accent so the sidebar reads as colorful without a
// color field on NavItem — same href always gets the same icon color.
const ICON_COLORS = [
  'text-cyan-300', 'text-orange-300', 'text-pink-300', 'text-emerald-300', 'text-amber-300',
  'text-purple-300', 'text-sky-300', 'text-rose-300', 'text-teal-300', 'text-indigo-300',
];

function iconColor(href: string) {
  let hash = 0;
  for (let i = 0; i < href.length; i++) hash = (hash * 31 + href.charCodeAt(i)) >>> 0;
  return ICON_COLORS[hash % ICON_COLORS.length];
}

// One icon per route across every module's sidebar.
const NAV_ICONS: Record<string, LucideIcon> = {
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
  '/day-itineraries': RouteIcon,
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
  '/attendance': CalendarCheck,
  '/leave': Plane,
  '/payroll': Wallet,
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
};

function navIcon(href: string): LucideIcon {
  return NAV_ICONS[href] ?? Circle;
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
        className={`relative flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-all ${
          active
            ? 'bg-brand-50 text-brand shadow-card'
            : 'text-white/80 hover:translate-x-0.5 hover:bg-white/10 hover:text-white'
        }`}
      >
        <Icon className={`h-4 w-4 shrink-0 ${active ? 'text-brand' : iconColor(item.href)}`} />
        {item.label}
      </Link>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <aside className="flex w-64 shrink-0 flex-col overflow-y-auto bg-brand-700">
        <div className="flex justify-center px-5 py-5">
          <Image src="/logo-white.png" alt="Holiday Vibez" width={160} height={40} className="h-auto w-36" priority />
        </div>
        <div className="px-5">
          <span className="inline-block rounded-lg bg-white/10 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-white/80">
            {activeModule.label}
          </span>
        </div>
        <nav className="flex flex-1 flex-col gap-0.5 p-3">
          {visibleGroups.map((group, i) => (
            <div key={group.title ?? 'top'} className={i > 0 ? 'mt-4' : undefined}>
              {group.title && (
                <p className="mb-1 px-3 text-xs font-semibold uppercase tracking-wide text-white/50">{group.title}</p>
              )}
              <div className="flex flex-col gap-0.5">{group.items.map(navLink)}</div>
            </div>
          ))}
        </nav>
      </aside>
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex shrink-0 items-center justify-between bg-brand-700 px-6 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-50 text-xs font-semibold text-brand shadow-card">
              {initials(user.name)}
            </div>
            <div>
              <p className="text-sm font-semibold text-white">{user.name}</p>
              <p className="text-xs font-medium text-white/70">{ROLE_LABELS[user.role] ?? user.role}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/modules"
              className="rounded-lg border border-white/30 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-white/10"
            >
              Modules
            </Link>
            <button
              onClick={() => logout()}
              className="rounded-lg border border-white/30 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-white/10"
            >
              Sign out
            </button>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto bg-gradient-to-br from-brand-700 via-brand to-brand-600 p-6">{children}</main>
      </div>
      <FloatingChatWidget />
    </div>
  );
}
