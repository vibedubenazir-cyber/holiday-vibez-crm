'use client';

import { FormEvent, useState } from 'react';
import { requestOtp, setTripToken, TripApiError, verifyOtp } from '@/lib/traveler';

/**
 * Two-step passwordless sign-in. The traveller types whatever contact detail
 * they gave the consultant — the server figures out whether it's a phone or
 * an email, so there's no "phone or email?" choice to get wrong.
 */
export function TripSignIn({ onSignedIn }: { onSignedIn: () => void }) {
  const [step, setStep] = useState<'identifier' | 'code'>('identifier');
  const [identifier, setIdentifier] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleRequest(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await requestOtp(identifier);
      setStep('code');
    } catch (err) {
      setError(err instanceof TripApiError ? err.message : 'Could not send your code');
    } finally {
      setBusy(false);
    }
  }

  async function handleVerify(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await verifyOtp(identifier, code);
      setTripToken(res.token, res.traveler.name);
      onSignedIn();
    } catch (err) {
      setError(err instanceof TripApiError ? err.message : 'Could not verify your code');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-extrabold tracking-tight text-brand-700">My Trip</h1>

        {step === 'identifier' ? (
          <>
            <p className="mt-1 text-sm text-slate-500">
              Enter the phone number or email address on your booking and we&apos;ll send you a code.
            </p>
            <form onSubmit={handleRequest} className="mt-5 space-y-3">
              <input
                required
                autoFocus
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="Phone number or email"
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-base"
              />
              <button
                type="submit"
                disabled={busy}
                className="w-full rounded-xl bg-gradient-to-br from-brand-600 to-brand-500 px-4 py-3 text-base font-semibold text-white shadow-md shadow-brand-500/25 disabled:opacity-60"
              >
                {busy ? 'Sending…' : 'Send code'}
              </button>
            </form>
          </>
        ) : (
          <>
            <p className="mt-1 text-sm text-slate-500">
              We&apos;ve sent a 6-digit code to <span className="font-medium text-slate-700">{identifier}</span>. It
              expires in 10 minutes.
            </p>
            <form onSubmit={handleVerify} className="mt-5 space-y-3">
              <input
                required
                autoFocus
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                // numeric keypad on phones; one-tap autofill from the SMS
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="6-digit code"
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-center text-2xl tracking-[0.4em]"
              />
              <button
                type="submit"
                disabled={busy || code.length !== 6}
                className="w-full rounded-xl bg-gradient-to-br from-brand-600 to-brand-500 px-4 py-3 text-base font-semibold text-white shadow-md shadow-brand-500/25 disabled:opacity-60"
              >
                {busy ? 'Checking…' : 'Open my trip'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setStep('identifier');
                  setCode('');
                  setError(null);
                }}
                className="w-full text-sm text-slate-500 underline"
              >
                Use a different number or email
              </button>
            </form>
          </>
        )}

        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      </div>

      <p className="mt-4 text-center text-xs text-slate-400">
        Your trip becomes available here once your booking is paid.
      </p>
    </div>
  );
}
