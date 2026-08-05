'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';

export default function HomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    router.replace(user ? '/dashboard' : '/login');
  }, [loading, user, router]);

  return (
    <main className="flex min-h-screen items-center justify-center">
      <p className="text-slate-500 dark:text-slate-400">Loading Holiday Vibez CRM...</p>
    </main>
  );
}
