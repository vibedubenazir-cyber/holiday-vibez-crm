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
  const [disableCode, setDisableCode] = useState('');
  const [confirmingDisable, setConfirmingDisable] = useState(false);
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
      await api.post('/auth/2fa/disable', { code: disableCode });
      setTwoFactorEnabled(false);
      setConfirmingDisable(false);
      setDisableCode('');
    } catch (err) {
      setTwoFactorError(err instanceof ApiError ? err.message : 'Invalid code');
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
      <h1 className="text-2xl font-extrabold tracking-tight text-brand-700">Security</h1>

      <section className="mt-4 rounded-xl border border-slate-200 bg-white dark:bg-slate-800 shadow-card transition-shadow hover:shadow-card-hover p-5">
        <h2 className="text-sm font-semibold text-brand-700">Two-Factor Authentication</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Require a 6-digit authenticator app code in addition to your password when signing in.
        </p>
        {twoFactorError && <p className="mt-2 text-sm text-red-600">{twoFactorError}</p>}

        {twoFactorEnabled ? (
          confirmingDisable ? (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={disableCode}
                onChange={(e) => setDisableCode(e.target.value)}
                placeholder="000000"
                autoFocus
                className="w-32 rounded-lg border border-slate-300 px-3 py-2 text-center text-sm tracking-widest focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-100 transition-colors"
              />
              <button
                onClick={handleDisable}
                disabled={twoFactorBusy || disableCode.length !== 6}
                className="rounded-lg border border-red-200 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 disabled:opacity-60"
              >
                Confirm Disable
              </button>
              <button
                onClick={() => {
                  setConfirmingDisable(false);
                  setDisableCode('');
                  setTwoFactorError(null);
                }}
                className="text-sm text-slate-500 hover:underline"
              >
                Cancel
              </button>
            </div>
          ) : (
            <div className="mt-4 flex items-center gap-3">
              <span className="rounded-lg bg-blue-100 px-2 py-0.5 text-xs text-blue-700">Enabled</span>
              <button
                onClick={() => setConfirmingDisable(true)}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50"
              >
                Disable 2FA
              </button>
            </div>
          )
        ) : setupData ? (
          <div className="mt-4 space-y-3">
            <img src={setupData.qrCodeDataUrl} alt="2FA QR code" className="h-40 w-40 rounded-lg border border-slate-200" />
            <p className="text-xs text-slate-500">
              Scan with an authenticator app (Google Authenticator, Authy, etc.), or enter this secret manually:{' '}
              <code className="rounded bg-slate-100 px-1 py-0.5">{setupData.secret}</code>
            </p>
            <div className="flex flex-wrap items-center gap-2">
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
                className="rounded-xl bg-gradient-to-br from-brand-600 to-brand-500 shadow-md shadow-brand-500/25 px-3 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60"
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
            className="mt-4 rounded-xl bg-gradient-to-br from-brand-600 to-brand-500 shadow-md shadow-brand-500/25 px-3 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60"
          >
            Enable 2FA
          </button>
        )}
      </section>

      <section className="mt-4 rounded-xl border border-slate-200 bg-white dark:bg-slate-800 shadow-card transition-shadow hover:shadow-card-hover p-5">
        <h2 className="text-sm font-semibold text-brand-700">Push Notifications</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Get a browser notification for lead assignments, SLA breaches, and quotation approvals.
        </p>

        {!isPushConfigured() ? (
          <p className="mt-4 text-xs text-slate-400">
            Not configured — set the <code className="rounded bg-slate-100 px-1 py-0.5">NEXT_PUBLIC_FIREBASE_*</code> env
            vars to enable this.
          </p>
        ) : pushResult === 'enabled' ? (
          <span className="mt-4 inline-block rounded-lg bg-blue-100 px-2 py-0.5 text-xs text-blue-700">
            Enabled
          </span>
        ) : (
          <>
            <button
              onClick={handleEnablePush}
              disabled={pushBusy}
              className="mt-4 rounded-xl bg-gradient-to-br from-brand-600 to-brand-500 shadow-md shadow-brand-500/25 px-3 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60"
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

      <h2 className="mt-8 text-sm font-semibold text-brand-700 dark:text-slate-100">Active Sessions</h2>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Devices currently signed in to your account. Revoke any you don't recognize.</p>
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      <div className="mt-4 overflow-x-auto bg-white dark:bg-slate-800">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="bg-brand-50/60 text-left text-xs font-semibold uppercase tracking-wide text-brand-700 dark:bg-slate-900/40 dark:text-brand-300">
            <tr><th className="px-4 py-2">Device</th><th className="px-4 py-2">IP</th><th className="px-4 py-2">Since</th><th className="px-4 py-2"></th></tr>
          </thead>
          <tbody>
            {sessions.map((s) => (
              <tr key={s.id} className="border-t border-slate-100">
                <td className="px-4 py-2">{s.deviceInfo}{s.current && <span className="ml-2 rounded-lg bg-blue-100 px-2 py-0.5 text-xs text-blue-700">This device</span>}</td>
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
