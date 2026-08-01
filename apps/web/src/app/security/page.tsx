'use client';

import { useEffect, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { api, ApiError } from '@/lib/api';
import type { SessionDTO } from '@holiday-vibez/shared';

export default function SecurityPage() {
  const [sessions, setSessions] = useState<SessionDTO[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      setSessions(await api.get<SessionDTO[]>('/auth/sessions'));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load sessions');
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleRevoke(id: string) {
    try {
      await api.delete(`/auth/sessions/${id}`);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to revoke session');
    }
  }

  return (
    <AppShell>
      <h1 className="text-lg font-semibold text-slate-800">Security — Active Sessions</h1>
      <p className="mt-1 text-sm text-slate-500">Devices currently signed in to your account. Revoke any you don't recognize.</p>
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      <div className="mt-4 overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr><th className="px-4 py-2">Device</th><th className="px-4 py-2">IP</th><th className="px-4 py-2">Since</th><th className="px-4 py-2"></th></tr>
          </thead>
          <tbody>
            {sessions.map((s) => (
              <tr key={s.id} className="border-t border-slate-100">
                <td className="px-4 py-2">{s.deviceInfo}{s.current && <span className="ml-2 rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700">This device</span>}</td>
                <td className="px-4 py-2 text-slate-500">{s.ipAddress}</td>
                <td className="px-4 py-2 text-slate-500">{new Date(s.createdAt).toLocaleString()}</td>
                <td className="px-4 py-2 text-right">
                  {!s.current && <button onClick={() => handleRevoke(s.id)} className="text-red-600 hover:underline">Revoke</button>}
                </td>
              </tr>
            ))}
            {sessions.length === 0 && <tr><td colSpan={4} className="px-4 py-6 text-center text-slate-400">No active sessions.</td></tr>}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}
