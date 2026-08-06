'use client';

import { useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Role } from '@holiday-vibez/shared';
import { useAuth } from '@/lib/auth-context';

type NavItem = { href: string; label: string; roles: Role[] };
type NavGroup = { title: string | null; items: NavItem[] };

// Sidebar is organized department-wise rather than one flat list — each
// group renders under its own header so staff can find the right tool by
// what area of the business it belongs to (Sales, Finance, Operations,
// Marketing, Admin), not by hunting through 28 alphabetically-unsorted rows.
const NAV_GROUPS: NavGroup[] = [
  {
    title: null,
    items: [{ href: '/dashboard', label: 'Dashboard', roles: [Role.DIRECTOR, Role.ADMIN, Role.BRANCH_MANAGER, Role.TRAVEL_CONSULTANT] }],
  },
  {
    title: 'Sales & CRM',
    items: [
      { href: '/leads', label: 'Leads', roles: [Role.DIRECTOR, Role.ADMIN, Role.BRANCH_MANAGER, Role.TRAVEL_CONSULTANT] },
      { href: '/inbox', label: 'Inbox', roles: [Role.DIRECTOR, Role.ADMIN, Role.BRANCH_MANAGER, Role.TRAVEL_CONSULTANT] },
      { href: '/quotations', label: 'Quotations', roles: [Role.DIRECTOR, Role.ADMIN, Role.BRANCH_MANAGER, Role.TRAVEL_CONSULTANT] },
      { href: '/approvals', label: 'Approvals', roles: [Role.ADMIN, Role.BRANCH_MANAGER] },
      { href: '/clients', label: 'Clients', roles: [Role.ADMIN, Role.DIRECTOR, Role.BRANCH_MANAGER, Role.TRAVEL_CONSULTANT] },
      { href: '/targets', label: 'Targets & Leaderboard', roles: [Role.DIRECTOR, Role.ADMIN, Role.BRANCH_MANAGER, Role.TRAVEL_CONSULTANT] },
    ],
  },
  {
    title: 'Finance',
    items: [
      { href: '/bookings', label: 'Bookings & Payments', roles: [Role.DIRECTOR, Role.ADMIN, Role.BRANCH_MANAGER, Role.TRAVEL_CONSULTANT] },
      { href: '/expenses', label: 'Accounts & Finance', roles: [Role.ADMIN, Role.DIRECTOR, Role.BRANCH_MANAGER] },
      { href: '/reports', label: 'Reports', roles: [Role.DIRECTOR, Role.ADMIN, Role.BRANCH_MANAGER] },
      { href: '/currency', label: 'Currency Exchange', roles: [Role.DIRECTOR, Role.ADMIN, Role.BRANCH_MANAGER, Role.TRAVEL_CONSULTANT] },
    ],
  },
  {
    title: 'Operations',
    items: [
      { href: '/packages', label: 'Packages', roles: [Role.DIRECTOR, Role.ADMIN, Role.BRANCH_MANAGER, Role.TRAVEL_CONSULTANT] },
      { href: '/calendar', label: 'Departure Calendar', roles: [Role.DIRECTOR, Role.ADMIN, Role.BRANCH_MANAGER, Role.TRAVEL_CONSULTANT] },
      { href: '/suppliers', label: 'Suppliers', roles: [Role.ADMIN, Role.DIRECTOR, Role.BRANCH_MANAGER] },
      { href: '/hotel-masters', label: 'Hotel Masters', roles: [Role.ADMIN, Role.DIRECTOR, Role.BRANCH_MANAGER] },
      { href: '/day-itineraries', label: 'Day Itinerary', roles: [Role.ADMIN, Role.DIRECTOR, Role.BRANCH_MANAGER] },
      { href: '/attendance', label: 'Attendance', roles: [Role.DIRECTOR, Role.ADMIN, Role.BRANCH_MANAGER, Role.TRAVEL_CONSULTANT] },
    ],
  },
  {
    title: 'Marketing & Website',
    items: [
      { href: '/marketing', label: 'Marketing', roles: [Role.ADMIN, Role.DIRECTOR] },
      { href: '/cms', label: 'Website CMS', roles: [Role.ADMIN, Role.DIRECTOR, Role.BRANCH_MANAGER] },
      { href: '/templates', label: 'Templates', roles: [Role.DIRECTOR, Role.ADMIN, Role.BRANCH_MANAGER, Role.TRAVEL_CONSULTANT] },
      { href: '/automation', label: 'Automation', roles: [Role.ADMIN, Role.DIRECTOR] },
    ],
  },
  {
    title: 'Admin',
    items: [
      { href: '/admin/users', label: 'Users', roles: [Role.ADMIN, Role.DIRECTOR] },
      { href: '/admin/branches', label: 'Branches', roles: [Role.ADMIN, Role.DIRECTOR, Role.BRANCH_MANAGER, Role.TRAVEL_CONSULTANT] },
      { href: '/admin/rates', label: 'Rate Cards', roles: [Role.ADMIN, Role.DIRECTOR, Role.BRANCH_MANAGER, Role.TRAVEL_CONSULTANT] },
      { href: '/custom-fields', label: 'Custom Fields', roles: [Role.ADMIN, Role.DIRECTOR] },
      { href: '/storage', label: 'File Storage', roles: [Role.ADMIN, Role.DIRECTOR, Role.BRANCH_MANAGER] },
      { href: '/data-admin', label: 'Data Admin', roles: [Role.ADMIN, Role.DIRECTOR] },
      { href: '/security', label: 'Security', roles: [Role.DIRECTOR, Role.ADMIN, Role.BRANCH_MANAGER, Role.TRAVEL_CONSULTANT] },
    ],
  },
];

const ROLE_LABELS: Record<string, string> = {
  DIRECTOR: 'Director',
  ADMIN: 'Admin',
  BRANCH_MANAGER: 'Branch Manager',
  TRAVEL_CONSULTANT: 'Travel Consultant',
};

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

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [loading, user, router]);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-slate-500">Loading...</p>
      </div>
    );
  }

  const visibleGroups = NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => item.roles.includes(user.role as Role)),
  })).filter((group) => group.items.length > 0);

  function navLink(item: NavItem) {
    const active = pathname === item.href;
    return (
      <Link
        key={item.href}
        href={item.href}
        className={`relative rounded-lg px-3 py-2 text-sm font-medium transition-all ${
          active
            ? 'bg-white text-brand shadow-card'
            : 'text-white/80 hover:translate-x-0.5 hover:bg-white/10 hover:text-white'
        }`}
      >
        {item.label}
      </Link>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <aside className="flex w-64 shrink-0 flex-col overflow-y-auto bg-brand-700">
        <div className="px-5 py-5">
          <Image src="/logo-white.png" alt="Holiday Vibez" width={160} height={40} className="h-auto w-28" priority />
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
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-xs font-semibold text-brand shadow-card">
              {initials(user.name)}
            </div>
            <div>
              <p className="text-sm font-semibold text-white">{user.name}</p>
              <p className="text-xs font-medium text-white/70">{ROLE_LABELS[user.role] ?? user.role}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
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
    </div>
  );
}
