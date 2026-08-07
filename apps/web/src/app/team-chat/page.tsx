'use client';

import { AppShell } from '@/components/AppShell';
import { TeamChatPanel } from '@/components/TeamChatPanel';

export default function TeamChatPage() {
  return (
    <AppShell>
      <h1 className="inline-block rounded-lg bg-white px-4 py-2 text-xl font-bold tracking-tight text-brand shadow-card dark:bg-slate-800 dark:text-white">Team Chat</h1>
      <div className="mt-4">
        <TeamChatPanel />
      </div>
    </AppShell>
  );
}
