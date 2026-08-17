'use client';

import { AppShell } from '@/components/AppShell';
import { TeamChatPanel } from '@/components/TeamChatPanel';

export default function TeamChatPage() {
  return (
    <AppShell>
      <h1 className="text-2xl font-extrabold tracking-tight text-brand-700 dark:bg-slate-800 dark:text-white">Team Chat</h1>
      <div className="mt-4">
        <TeamChatPanel />
      </div>
    </AppShell>
  );
}
