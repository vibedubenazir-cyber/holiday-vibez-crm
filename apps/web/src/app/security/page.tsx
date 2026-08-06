'use client';

import { useEffect, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { api, ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { isPushConfigured, requestPushPermission, type PushPermissionResult } from '@/lib/push';
import type { SessionDTO, TwoFactorSetupDTO } from '@holiday-vibez/shared';

export default function SecurityPage() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<SessionDTO[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [setupData, setSetupData] = useState<TwoFactorSetupDTO | null>(null);
  const [confirmCode, setConfirmCode] = useState('');
  const [twoFactorError, setTwoFactorError] = useState<string | null>(null);
  const [twoFactorBusy, setTwoFactorBusy] = useState(false);

  const [pushResult, setPushResult] = useState<PushPermissionResult | null>(null);
  const [pushBusy, setPushBusy] = useState(false);

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

  useEffect(() => {
    setTwoFactorEnabled(Boolean(user?.twoFactorEnabled));
  }, [user]);

  async function handleRevoke(id: string) {
    try {
      await api.delete(`/auth/sessions/${id}`);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to revoke session');
    }
  }

  async function handleStartSetup() {
    setTwoFactorError(null);
    setTwoFactorBusy(true);
    try {
      setSetupData(await api.post<TwoFactorSetupDTO>('/auth/2fa/setup'));
    } catch (err) {
      setTwoFactorError(err instanceof ApiError ? err.message : 'Failed to start 2FA setup');
    } finally {
      setTwoFactorBusy(false);
    }
  }

  async function handleConfirmSetup() {
    setTwoFactorError(null);
    setTwoFactorBusy(true);
    try {
      await api.post('/auth/2fa/confirm', { code: confirmCode });
      setTwoFactorEnabled(true);
      setSetupData(null);
      setConfirmCode('');
    } catch (err) {
      setTwoFactorError(err instanceof ApiError ? err.message : 'Invalid code');
    } finally {
      setTwoFactorBusy(false);
    }
  }

  async function handleDisable() {
    setTwoFactorError(null);
    setTwoFactorBusy(true);
    try {
      await api.post('/auth/2fa/disable');
      setTwoFactorEnabled(false);
    } catch (err) {
      setTwoFactorError(err instanceof ApiError ? err.message : 'Failed to disable 2FA');
    } finally {
      setTwoFactorBusy(false);
    }
  }

  async function handleEnablePush() {
    setPushBusy(true);
    try {
      setPushResult(await requestPushPermission());
    } finally {
      setPushBusy(false);
    }
  }

  return (
    <AppShell>
      <h1 className="inline-block rounded-lg bg-white px-4 py-2 text-xl font-bold tracking-tight text-brand shadow-card">Security</h1>

      <section className="mt-4 rounded-xl border border-slate-200 bg-white shadow-card transition-shadow hover:shadow-card-hover p-5">
        <h2 className="text-sm font-semibold text-slate-800">Two-Factor Authentication</h2>
        <p className="mt-1 text-sm text-blue-100">
          Require a 6-digit authenticator app code in addition to your password when signing in.
        </p>
        {twoFactorError && <p className="mt-2 text-sm text-red-600">{twoFactorError}</p>}

        {twoFactorEnabled ? (
          <div className="mt-4 flex items-center gap-3">
            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700">Enabled</span>
            <button
              onClick={handleDisable}
              disabled={twoFactorBusy}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 disabled:opacity-60"
            >
              Disable 2FA
            </button>
          </div>
        ) : setupData ? (
          <div className="mt-4 space-y-3">
            <img src={setupData.qrCodeDataUrl} alt="2FA QR code" className="h-40 w-40 rounded-lg border border-slate-200" />
            <p className="text-xs text-slate-500">
              Scan with an authenticator app (Google Authenticator, Authy, etc.), or enter this secret manually:{' '}
              <code className="rounded bg-slate-100 px-1 py-0.5">{setupData.secret}</code>
            </p>
            <div className="flex items-center gap-2">
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={confirmCode}
                onChange={(e) => setConfirmCode(e.target.value)}
                placeholder="000000"
                className="w-32 rounded-lg border border-slate-300 px-3 py-2 text-center text-sm tracking-widest focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-100 transition-colors"
              />
              <button
                onClick={handleConfirmSetup}
                disabled={twoFactorBusy || confirmCode.length !== 6}
                className="rounded-lg bg-brand px-3 py-2 text-sm font-medium text-white hover:bg-brand-dark disabled:opacity-60"
              >
                Confirm & Enable
              </button>
              <button
                onClick={() => {
                  setSetupData(null);
                  setConfirmCode('');
                }}
                className="text-sm text-slate-500 hover:underline"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={handleStartSetup}
            disabled={twoFactorBusy}
            className="mt-4 rounded-lg bg-brand px-3 py-2 text-sm font-medium text-white hover:bg-brand-dark disabled:opacity-60"
          >
            Enable 2FA
          </button>
        )}
      </section>

      <section className="mt-4 rounded-xl border border-slate-200 bg-white shadow-card transition-shadow hover:shadow-card-hover p-5">
        <h2 className="text-sm font-semibold text-slate-800">Push Notifications</h2>
        <p className="mt-1 text-sm text-blue-100">
          Get a browser notification for lead assignments, SLA breaches, and quotation approvals.
        </p>

        {!isPushConfigured() ? (
          <p className="mt-4 text-xs text-slate-400">
            Not configured — set the <code className="rounded bg-slate-100 px-1 py-0.5">NEXT_PUBLIC_FIREBASE_*</code> env
            vars to enable this.
          </p>
        ) : pushResult === 'enabled' ? (
          <span className="mt-4 inline-block rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700">
            Enabled
          </span>
        ) : (
          <>
            <button
              onClick={handleEnablePush}
              disabled={pushBusy}
              className="mt-4 rounded-lg bg-brand px-3 py-2 text-sm font-medium text-white hover:bg-brand-dark disabled:opacity-60"
            >
              {pushBusy ? 'Requesting…' : 'Enable push notifications'}
            </button>
            {pushResult === 'denied' && (
              <p className="mt-2 text-sm text-red-600">
                Permission denied — enable notifications for this site in your browser settings, then try again.
              </p>
            )}
            {pushResult === 'unsupported' && (
              <p className="mt-2 text-sm text-red-600">Push notifications aren't supported in this browser.</p>
            )}
            {pushResult === 'error' && <p className="mt-2 text-sm text-red-600">Something went wrong — try again.</p>}
          </>
        )}
      </section>

      <h2 className="mt-8 text-sm font-semibold text-white">Active Sessions</h2>
      <p className="mt-1 text-sm text-blue-100">Devices currently signed in to your account. Revoke any you don't recognize.</p>
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-card transition-shadow hover:shadow-card-hover">
        <table className="w-full text-sm">
          <thead className="bg-brand-50/60 text-left text-xs font-semibold uppercase tracking-wide text-brand-700">
            <tr><th className="px-4 py-2">Device</th><th className="px-4 py-2">IP</th><th className="px-4 py-2">Since</th><th className="px-4 py-2"></th></tr>
          </thead>
          <tbody>
            {sessions.map((s) => (
              <tr key={s.id} className="border-t border-slate-100">
                <td className="px-4 py-2">{s.deviceInfo}{s.current && <span className="ml-2 rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700">This device</span>}</td>
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
