'use client';

import { useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Role } from '@holiday-vibez/shared';
import { useAuth } from '@/lib/auth-context';

const NAV_ITEMS: { href: string; label: string; roles: Role[] }[] = [
  { href: '/dashboard', label: 'Dashboard', roles: [Role.DIRECTOR, Role.ADMIN, Role.BRANCH_MANAGER, Role.TRAVEL_CONSULTANT] },
  { href: '/leads', label: 'Leads', roles: [Role.DIRECTOR, Role.ADMIN, Role.BRANCH_MANAGER, Role.TRAVEL_CONSULTANT] },
  { href: '/inbox', label: 'Inbox', roles: [Role.DIRECTOR, Role.ADMIN, Role.BRANCH_MANAGER, Role.TRAVEL_CONSULTANT] },
  { href: '/quotations', label: 'Quotations', roles: [Role.DIRECTOR, Role.ADMIN, Role.BRANCH_MANAGER, Role.TRAVEL_CONSULTANT] },
  { href: '/approvals', label: 'Approvals', roles: [Role.ADMIN, Role.BRANCH_MANAGER] },
  { href: '/bookings', label: 'Bookings & Payments', roles: [Role.DIRECTOR, Role.ADMIN, Role.BRANCH_MANAGER, Role.TRAVEL_CONSULTANT] },
  { href: '/calendar', label: 'Departure Calendar', roles: [Role.DIRECTOR, Role.ADMIN, Role.BRANCH_MANAGER, Role.TRAVEL_CONSULTANT] },
  { href: '/packages', label: 'Packages', roles: [Role.DIRECTOR, Role.ADMIN, Role.BRANCH_MANAGER, Role.TRAVEL_CONSULTANT] },
  { href: '/suppliers', label: 'Suppliers', roles: [Role.ADMIN, Role.DIRECTOR, Role.BRANCH_MANAGER] },
  { href: '/expenses', label: 'Accounts & Finance', roles: [Role.ADMIN, Role.DIRECTOR, Role.BRANCH_MANAGER] },
  { href: '/attendance', label: 'Attendance', roles: [Role.DIRECTOR, Role.ADMIN, Role.BRANCH_MANAGER, Role.TRAVEL_CONSULTANT] },
  { href: '/templates', label: 'Templates', roles: [Role.DIRECTOR, Role.ADMIN, Role.BRANCH_MANAGER, Role.TRAVEL_CONSULTANT] },
  { href: '/marketing', label: 'Marketing', roles: [Role.ADMIN, Role.DIRECTOR] },
  { href: '/automation', label: 'Automation', roles: [Role.ADMIN, Role.DIRECTOR] },
  { href: '/custom-fields', label: 'Custom Fields', roles: [Role.ADMIN, Role.DIRECTOR] },
  { href: '/cms', label: 'Website CMS', roles: [Role.ADMIN, Role.DIRECTOR, Role.BRANCH_MANAGER] },
  { href: '/targets', label: 'Targets & Leaderboard', roles: [Role.DIRECTOR, Role.ADMIN, Role.BRANCH_MANAGER, Role.TRAVEL_CONSULTANT] },
  { href: '/reports', label: 'Reports', roles: [Role.DIRECTOR, Role.ADMIN, Role.BRANCH_MANAGER] },
  { href: '/admin/users', label: 'Users', roles: [Role.ADMIN, Role.DIRECTOR] },
  { href: '/admin/branches', label: 'Branches', roles: [Role.ADMIN, Role.DIRECTOR, Role.BRANCH_MANAGER, Role.TRAVEL_CONSULTANT] },
  { href: '/admin/rates', label: 'Rate Cards', roles: [Role.ADMIN, Role.DIRECTOR, Role.BRANCH_MANAGER, Role.TRAVEL_CONSULTANT] },
  { href: '/currency', label: 'Currency Exchange', roles: [Role.DIRECTOR, Role.ADMIN, Role.BRANCH_MANAGER, Role.TRAVEL_CONSULTANT] },
  { href: '/security', label: 'Security', roles: [Role.DIRECTOR, Role.ADMIN, Role.BRANCH_MANAGER, Role.TRAVEL_CONSULTANT] },
];

const ROLE_LABELS: Record<string, string> = {
  DIRECTOR: 'Director',
  ADMIN: 'Admin',
  BRANCH_MANAGER: 'Branch Manager',
  TRAVEL_CONSULTANT: 'Travel Consultant',
};

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

  const visibleNav = NAV_ITEMS.filter((item) => item.roles.includes(user.role as Role));

  return (
    <div className="flex min-h-screen">
      <aside className="w-60 shrink-0 border-r border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-5 py-4">
          <Image src="/logo.png" alt="Holiday Vibez" width={160} height={40} className="h-auto w-32" priority />
        </div>
        <nav className="flex flex-col gap-1 p-3">
          {visibleNav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-md px-3 py-2 text-sm font-medium transition ${
                pathname === item.href
                  ? 'bg-brand-light text-brand-dark'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>
      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3">
          <div>
            <p className="text-sm font-medium text-slate-800">{user.name}</p>
            <p className="text-xs text-slate-400">{ROLE_LABELS[user.role] ?? user.role}</p>
          </div>
          <button
            onClick={() => logout()}
            className="rounded-md border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100"
          >
            Sign out
          </button>
        </header>
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
