'use client';

import { FormEvent, useState } from 'react';
import Image from 'next/image';
import { useAuth } from '@/lib/auth-context';
import { ApiError } from '@/lib/api';

export default function LoginPage() {
  const { login, verifyTwoFactor } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [twoFactorUserId, setTwoFactorUserId] = useState<string | null>(null);
  const [code, setCode] = useState('');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const result = await login(email, password);
      if (result?.requiresTwoFactor) {
        setTwoFactorUserId(result.userId);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Login failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleVerify(e: FormEvent) {
    e.preventDefault();
    if (!twoFactorUserId) return;
    setError(null);
    setSubmitting(true);
    try {
      await verifyTwoFactor(twoFactorUserId, code);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Invalid code. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  if (twoFactorUserId) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4">
        <div className="w-full max-w-sm rounded-xl bg-white dark:bg-slate-800 p-8 shadow-sm ring-1 ring-slate-200">
          <div className="mb-6 text-center">
            <Image src="/logo.png" alt="Holiday Vibez" width={220} height={55} className="mx-auto h-auto w-48" priority />
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Enter the 6-digit code from your authenticator app</p>
          </div>
          <form onSubmit={handleVerify} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200" htmlFor="code">
                Authentication code
              </label>
              <input
                id="code"
                type="text"
                inputMode="numeric"
                required
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="mt-1 w-full rounded-md border border-slate-300 dark:border-slate-600 px-3 py-2 text-center text-lg tracking-widest focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
                placeholder="000000"
                autoFocus
              />
            </div>
            {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-md bg-brand px-3 py-2 text-sm font-medium text-white transition hover:bg-brand-dark disabled:opacity-60"
            >
              {submitting ? 'Verifying...' : 'Verify'}
            </button>
            <button
              type="button"
              onClick={() => {
                setTwoFactorUserId(null);
                setCode('');
                setError(null);
              }}
              className="w-full text-center text-sm text-slate-500 dark:text-slate-400 hover:underline"
            >
              Back to sign in
            </button>
          </form>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-xl bg-white dark:bg-slate-800 p-8 shadow-sm ring-1 ring-slate-200">
        <div className="mb-6 text-center">
          <Image src="/logo.png" alt="Holiday Vibez" width={220} height={55} className="mx-auto h-auto w-48" priority />
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Sign in to your account</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
              placeholder="you@holidayvibez.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
              placeholder="••••••••"
            />
          </div>
          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-md bg-brand px-3 py-2 text-sm font-medium text-white transition hover:bg-brand-dark disabled:opacity-60"
          >
            {submitting ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
      </div>
    </main>
  );
}
