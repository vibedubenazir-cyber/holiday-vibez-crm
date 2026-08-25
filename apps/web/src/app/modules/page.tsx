'use client';

import { useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Compass, Users, Wallet, GraduationCap, Folder, type LucideIcon } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { MODULES, setSelectedModule } from '@/lib/modules';
import type { Role } from '@holiday-vibez/shared';

const MODULE_ICONS: Record<string, { icon: LucideIcon; tile: string }> = {
  CRM: { icon: Compass, tile: 'from-brand-500 to-brand-600' },
  HRMS: { icon: Users, tile: 'from-violet-500 to-violet-600' },
  FINANCE: { icon: Wallet, tile: 'from-emerald-500 to-emerald-600' },
  LMS: { icon: GraduationCap, tile: 'from-amber-500 to-amber-600' },
};
const FALLBACK_ICON = { icon: Folder, tile: 'from-slate-400 to-slate-500' };

export default function ModulesPage() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();

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

  const visibleModules = MODULES.filter((m) => m.groups.some((g) => g.items.some((i) => i.roles.includes(user.role as Role))));

  function handleSelect(id: (typeof MODULES)[number]['id'], homeHref: string) {
    setSelectedModule(id);
    router.push(homeHref);
  }

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-brand-700 via-brand to-brand-600">
      <header className="flex flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-8 sm:py-5">
        <Image src="/logo-white.png" alt="Holiday Vibez" width={160} height={40} className="h-auto w-32" priority />
        <div className="flex items-center gap-3">
          <p className="text-sm font-medium text-white/80">{user.name}</p>
          <button
            onClick={() => logout()}
            className="rounded-lg border border-white/30 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-white/10"
          >
            Sign out
          </button>
        </div>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center px-6 pb-16">
        <h1 className="text-2xl font-bold tracking-tight text-white">Choose a module</h1>
        <p className="mt-1 text-sm text-blue-100">Pick where you want to work — you can come back here any time.</p>

        <div className="mt-8 grid w-full max-w-3xl grid-cols-1 gap-4 sm:grid-cols-2">
          {visibleModules.map((m) => {
            const { icon: Icon, tile } = MODULE_ICONS[m.id] ?? FALLBACK_ICON;
            return (
              <button
                key={m.id}
                onClick={() => handleSelect(m.id, m.homeHref)}
                className="flex flex-col items-start gap-3 rounded-xl bg-white dark:bg-slate-800 p-6 text-left shadow-card transition-all hover:-translate-y-0.5 hover:shadow-card-hover"
              >
                <span className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${tile} text-white shadow-md`}>
                  <Icon className="h-6 w-6" />
                </span>
                <span className="text-lg font-bold text-brand">{m.label}</span>
                <span className="text-sm text-slate-500">{m.description}</span>
              </button>
            );
          })}
        </div>
      </main>
    </div>
  );
}
