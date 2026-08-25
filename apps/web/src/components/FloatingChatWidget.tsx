'use client';

import { useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { TeamChatPanel } from './TeamChatPanel';

const HEARTBEAT_INTERVAL_MS = 25000;

// `open` is owned by AppShell: below md the toggle lives in the page header
// rather than in a floating bubble, so the two have to share the state.
export function FloatingChatWidget({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { user: me } = useAuth();

  useEffect(() => {
    if (!me) return;
    const ping = () => api.post('/team-chat/presence/heartbeat').catch(() => {});
    ping();
    const interval = setInterval(ping, HEARTBEAT_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [me]);

  if (!me) return null;

  return (
    <>
      {open && (
        <div className="fixed inset-x-3 bottom-3 z-50 flex h-[70vh] max-h-[500px] flex-col overflow-hidden rounded-xl bg-white shadow-2xl dark:bg-slate-800 md:inset-x-auto md:bottom-20 md:right-5 md:h-[500px] md:w-[440px]">
          <div className="flex items-center justify-between bg-gradient-to-br from-brand-600 to-brand-500 shadow-md shadow-brand-500/25 px-3 py-2.5">
            <span className="text-sm font-semibold text-white">Team Chat</span>
            <div className="flex items-center gap-2">
              <a href="/team-chat" className="text-xs text-white/80 hover:text-white hover:underline">Open full view</a>
              <button onClick={() => onOpenChange(false)} className="text-white/80 hover:text-white" aria-label="Close">✕</button>
            </div>
          </div>
          <div className="flex-1 overflow-hidden bg-slate-50 p-2 dark:bg-slate-900">
            <TeamChatPanel compact />
          </div>
        </div>
      )}

      {/* Desktop only. On a phone a fixed bubble sits on top of whichever list
          card happens to scroll under it, covering that row's actions — there
          the toggle lives in the header instead. */}
      <button
        onClick={() => onOpenChange(!open)}
        className="fixed bottom-5 right-5 z-50 hidden h-14 w-14 items-center justify-center rounded-full bg-brand text-white shadow-2xl transition-transform hover:scale-105 md:flex"
        aria-label="Toggle team chat"
      >
        {open ? (
          <span className="text-xl">✕</span>
        ) : (
          <span className="text-2xl">💬</span>
        )}
      </button>
    </>
  );
}
