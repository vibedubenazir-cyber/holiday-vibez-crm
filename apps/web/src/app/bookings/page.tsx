'use client';

import { useEffect, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { api, ApiError } from '@/lib/api';
import type { BookingDTO } from '@holiday-vibez/shared';

export default function BookingsPage() {
  const [bookings, setBookings] = useState<BookingDTO[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [paymentForm, setPaymentForm] = useState({ type: 'CLIENT_RECEIPT', amount: '' });

  async function load() {
    try {
      setBookings(await api.get<BookingDTO[]>('/bookings'));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load bookings');
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleAddPayment(bookingId: string) {
    try {
      await api.post('/payments', { bookingId, type: paymentForm.type, amount: Number(paymentForm.amount) });
      setPaymentForm({ type: 'CLIENT_RECEIPT', amount: '' });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to add payment');
    }
  }

  async function handleMarkPaid(paymentId: string) {
    try {
      await api.patch(`/payments/${paymentId}/mark-paid`);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to mark payment paid');
    }
  }

  return (
    <AppShell>
      <h1 className="text-lg font-semibold text-slate-800">Bookings & Payments</h1>
      <p className="mt-1 text-sm text-slate-500">
        Bookings are created from approved (SENT) quotations. Payments feed branch P&L and target achievement automatically once marked paid.
      </p>
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      <div className="mt-4 space-y-3">
        {bookings.map((b) => (
          <div key={b.id} className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-slate-800">{b.quotation?.lead?.clientName} · {b.quotation?.lead?.destination}</p>
                <p className="text-xs text-slate-500">
                  Departs {new Date(b.departureDate).toLocaleDateString()} · Status: {b.status} · Total ₹{Number(b.quotation?.totalAmount ?? 0).toLocaleString('en-IN')}
                </p>
              </div>
              <button onClick={() => setExpanded(expanded === b.id ? null : b.id)} className="text-sm text-brand hover:underline">
                {expanded === b.id ? 'Hide payments' : 'Manage payments'}
              </button>
            </div>

            {expanded === b.id && (
              <div className="mt-3 border-t border-slate-100 pt-3">
                <table className="w-full text-sm">
                  <thead className="text-left text-xs uppercase tracking-wide text-slate-500">
                    <tr><th className="py-1">Type</th><th className="py-1">Amount</th><th className="py-1">Status</th><th></th></tr>
                  </thead>
                  <tbody>
                    {(b.payments ?? []).map((p) => (
                      <tr key={p.id} className="border-t border-slate-100">
                        <td className="py-1">{p.type}</td>
                        <td className="py-1">₹{Number(p.amount).toLocaleString('en-IN')}</td>
                        <td className="py-1">{p.paidAt ? `Paid ${new Date(p.paidAt).toLocaleDateString()}` : 'Pending'}</td>
                        <td className="py-1 text-right">
                          {!p.paidAt && <button onClick={() => handleMarkPaid(p.id)} className="text-emerald-600 hover:underline">Mark paid</button>}
                        </td>
                      </tr>
                    ))}
                    {(!b.payments || b.payments.length === 0) && (
                      <tr><td colSpan={4} className="py-2 text-center text-slate-400">No payments recorded yet.</td></tr>
                    )}
                  </tbody>
                </table>
                <div className="mt-3 flex items-end gap-2">
                  <select value={paymentForm.type} onChange={(e) => setPaymentForm({ ...paymentForm, type: e.target.value })} className="rounded-md border border-slate-300 px-3 py-2 text-sm">
                    <option value="CLIENT_RECEIPT">Client receipt</option>
                    <option value="DMC_PAYABLE">DMC payable</option>
                    <option value="COMMISSION">Commission</option>
                    <option value="REFUND">Refund</option>
                  </select>
                  <input type="number" placeholder="Amount" value={paymentForm.amount} onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })} className="w-32 rounded-md border border-slate-300 px-3 py-2 text-sm" />
                  <button onClick={() => handleAddPayment(b.id)} className="rounded-md bg-brand px-3 py-2 text-sm font-medium text-white hover:bg-brand-dark">Add payment</button>
                </div>
              </div>
            )}
          </div>
        ))}
        {bookings.length === 0 && <p className="text-sm text-slate-400">No bookings yet — convert an approved quotation into a booking.</p>}
      </div>
    </AppShell>
  );
}
