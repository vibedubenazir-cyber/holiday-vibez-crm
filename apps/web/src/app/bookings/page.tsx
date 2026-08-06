'use client';

import { useEffect, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { api, ApiError } from '@/lib/api';
import type { BookingDTO, InvoiceDTO, VoucherDTO } from '@holiday-vibez/shared';

const PAYMENT_TYPE_COLORS: Record<string, string> = {
  CLIENT_RECEIPT: 'bg-blue-100 text-blue-700',
  DMC_PAYABLE: 'bg-blue-100 text-blue-700',
  COMMISSION: 'bg-blue-100 text-blue-700',
  REFUND: 'bg-blue-100 text-blue-700',
};

export default function BookingsPage() {
  const [bookings, setBookings] = useState<BookingDTO[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [paymentForm, setPaymentForm] = useState({ type: 'CLIENT_RECEIPT', category: 'DMC', amount: '' });
  const [vouchers, setVouchers] = useState<Record<string, VoucherDTO[]>>({});
  const [invoices, setInvoices] = useState<Record<string, InvoiceDTO[]>>({});
  const [linkBusy, setLinkBusy] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

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
      await api.post('/payments', {
        bookingId,
        type: paymentForm.type,
        category: paymentForm.type === 'CLIENT_RECEIPT' ? undefined : paymentForm.category,
        amount: Number(paymentForm.amount),
      });
      setPaymentForm({ type: 'CLIENT_RECEIPT', category: 'DMC', amount: '' });
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

  async function handleGeneratePaymentLink(paymentId: string) {
    setError(null);
    setLinkBusy(paymentId);
    try {
      await api.post(`/payments/${paymentId}/create-payment-link`);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to generate payment link');
    } finally {
      setLinkBusy(null);
    }
  }

  async function handleCopyLink(paymentId: string, url: string) {
    await navigator.clipboard.writeText(url);
    setCopiedId(paymentId);
    setTimeout(() => setCopiedId((id) => (id === paymentId ? null : id)), 2000);
  }

  async function loadDocs(bookingId: string) {
    try {
      const [v, i] = await Promise.all([
        api.get<VoucherDTO[]>(`/bookings/${bookingId}/vouchers`),
        api.get<InvoiceDTO[]>(`/bookings/${bookingId}/invoices`),
      ]);
      setVouchers((prev) => ({ ...prev, [bookingId]: v }));
      setInvoices((prev) => ({ ...prev, [bookingId]: i }));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load vouchers/invoices');
    }
  }

  async function handleGenerateVoucher(bookingId: string) {
    try {
      await api.post(`/bookings/${bookingId}/vouchers`, { type: 'COMBINED' });
      await loadDocs(bookingId);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to generate voucher');
    }
  }

  async function handleGenerateInvoice(bookingId: string) {
    try {
      await api.post(`/bookings/${bookingId}/invoices`, { type: 'MANUAL' });
      await loadDocs(bookingId);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to generate invoice');
    }
  }

  function toggleExpanded(bookingId: string) {
    const next = expanded === bookingId ? null : bookingId;
    setExpanded(next);
    if (next) loadDocs(next);
  }

  return (
    <AppShell>
      <h1 className="inline-block rounded-lg bg-white px-4 py-2 text-xl font-bold tracking-tight text-brand shadow-card">Bookings & Payments</h1>
      <p className="mt-1 text-sm text-blue-100">
        Bookings are created from approved (SENT) quotations. Generate a payment link to send the customer a real hosted-checkout
        page (Razorpay), or use "Mark paid" for offline/cash payments already received — either way, payments feed branch P&L
        and target achievement automatically once paid.
      </p>
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      <div className="mt-4 space-y-3">
        {bookings.map((b) => (
          <div key={b.id} className="rounded-xl border-t-4 border-t-blue-500 border-x border-b border-slate-200 bg-white shadow-card transition-shadow hover:shadow-card-hover p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-slate-800">{b.quotation?.lead?.clientName} · {b.quotation?.lead?.destination}</p>
                <p className="mt-1 text-xs text-blue-100">
                  Departs {new Date(b.departureDate).toLocaleDateString()} ·{' '}
                  <span className="rounded-full bg-blue-100 px-2 py-0.5 font-medium text-blue-700">{b.status}</span>{' '}
                  · Total ₹{Number(b.quotation?.totalAmount ?? 0).toLocaleString('en-IN')}
                </p>
              </div>
              <button onClick={() => toggleExpanded(b.id)} className="text-sm text-brand hover:underline">
                {expanded === b.id ? 'Hide details' : 'Manage payments & documents'}
              </button>
            </div>

            {expanded === b.id && (
              <div className="mt-3 border-t border-slate-100 pt-3">
                <table className="w-full text-sm">
                  <thead className="text-left text-xs font-semibold uppercase tracking-wide text-brand">
                    <tr><th className="py-1">Type</th><th className="py-1">Amount</th><th className="py-1">Status</th><th></th></tr>
                  </thead>
                  <tbody>
                    {(b.payments ?? []).map((p) => (
                      <tr key={p.id} className="border-t border-slate-100">
                        <td className="py-1">
                          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${PAYMENT_TYPE_COLORS[p.type] ?? 'bg-slate-100 text-slate-600'}`}>
                            {p.type.replaceAll('_', ' ')}
                          </span>
                          {p.category && <span className="ml-1.5 text-xs text-slate-400">{p.category}</span>}
                        </td>
                        <td className="py-1">₹{Number(p.amount).toLocaleString('en-IN')}</td>
                        <td className="py-1">
                          {p.paidAt ? (
                            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                              Paid {new Date(p.paidAt).toLocaleDateString()}
                            </span>
                          ) : (
                            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">Pending</span>
                          )}
                        </td>
                        <td className="py-1 text-right">
                          {!p.paidAt && (
                            <div className="flex items-center justify-end gap-3">
                              {p.gatewayLinkUrl ? (
                                <button onClick={() => handleCopyLink(p.id, p.gatewayLinkUrl!)} className="text-brand hover:underline">
                                  {copiedId === p.id ? 'Copied!' : 'Copy payment link'}
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleGeneratePaymentLink(p.id)}
                                  disabled={linkBusy === p.id}
                                  className="text-brand hover:underline disabled:opacity-60"
                                >
                                  {linkBusy === p.id ? 'Generating…' : 'Generate payment link'}
                                </button>
                              )}
                              <button onClick={() => handleMarkPaid(p.id)} className="text-blue-600 hover:underline">Mark paid</button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                    {(!b.payments || b.payments.length === 0) && (
                      <tr><td colSpan={4} className="py-2 text-center text-slate-400">No payments recorded yet.</td></tr>
                    )}
                  </tbody>
                </table>
                <div className="mt-3 flex items-end gap-2">
                  <select value={paymentForm.type} onChange={(e) => setPaymentForm({ ...paymentForm, type: e.target.value })} className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-100 transition-colors">
                    <option value="CLIENT_RECEIPT">Client receipt</option>
                    <option value="DMC_PAYABLE">DMC payable</option>
                    <option value="COMMISSION">Commission</option>
                    <option value="REFUND">Refund</option>
                  </select>
                  {paymentForm.type !== 'CLIENT_RECEIPT' && (
                    <select value={paymentForm.category} onChange={(e) => setPaymentForm({ ...paymentForm, category: e.target.value })} className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-100 transition-colors">
                      <option value="DMC">DMC</option>
                      <option value="FLIGHT">Flight</option>
                      <option value="HOTEL">Hotel</option>
                      <option value="ACTIVITY">Activity</option>
                      <option value="OTHER">Other</option>
                    </select>
                  )}
                  <input type="number" placeholder="Amount" value={paymentForm.amount} onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })} className="w-32 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-100 transition-colors" />
                  <button onClick={() => handleAddPayment(b.id)} className="rounded-lg bg-brand px-3 py-2 text-sm font-medium text-white hover:bg-brand-dark">Add payment</button>
                </div>

                <div className="mt-4 border-t border-slate-100 pt-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Vouchers</p>
                  <ul className="mt-1 space-y-1">
                    {(vouchers[b.id] ?? []).map((v) => (
                      <li key={v.id} className="text-sm">
                        <a href={v.pdfUrl ?? '#'} className="text-brand hover:underline">{v.refNo}</a>{' '}
                        <span className="text-slate-400">· {v.type} · issued {new Date(v.issuedAt).toLocaleDateString()}</span>
                      </li>
                    ))}
                    {(!vouchers[b.id] || vouchers[b.id].length === 0) && <li className="text-sm text-slate-400">None generated yet.</li>}
                  </ul>
                  <button onClick={() => handleGenerateVoucher(b.id)} className="mt-2 rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:border-brand-200 hover:bg-brand-50 hover:text-brand">
                    Generate voucher
                  </button>
                </div>

                <div className="mt-4 border-t border-slate-100 pt-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Invoices</p>
                  <ul className="mt-1 space-y-1">
                    {(invoices[b.id] ?? []).map((i) => (
                      <li key={i.id} className="text-sm">
                        <a href={i.pdfUrl ?? '#'} className="text-brand hover:underline">{i.invoiceNo}</a>{' '}
                        <span className="text-slate-400">· {i.currency} {Number(i.amount).toLocaleString('en-IN')} · issued {new Date(i.issuedAt).toLocaleDateString()}</span>
                      </li>
                    ))}
                    {(!invoices[b.id] || invoices[b.id].length === 0) && <li className="text-sm text-slate-400">None generated yet.</li>}
                  </ul>
                  <button onClick={() => handleGenerateInvoice(b.id)} className="mt-2 rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:border-brand-200 hover:bg-brand-50 hover:text-brand">
                    Generate invoice
                  </button>
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
