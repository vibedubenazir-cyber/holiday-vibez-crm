'use client';

import { useEffect, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { api, ApiError } from '@/lib/api';
import { BookingStatus } from '@holiday-vibez/shared';
import type { BookingDTO, InvoiceDTO, VoucherDTO, ReviewDTO, TripFeedbackDTO, InsurancePolicyDTO } from '@holiday-vibez/shared';

const PAYMENT_TYPE_COLORS: Record<string, string> = {
  CLIENT_RECEIPT: 'bg-blue-100 text-blue-700',
  DMC_PAYABLE: 'bg-blue-100 text-blue-700',
  COMMISSION: 'bg-blue-100 text-blue-700',
  REFUND: 'bg-blue-100 text-blue-700',
};

const BOOKING_STATUS_OPTIONS = [BookingStatus.PENDING, BookingStatus.CONFIRMED, BookingStatus.CANCELLED, BookingStatus.COMPLETED];

const BOOKING_STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-slate-200 text-slate-700',
  CONFIRMED: 'bg-blue-100 text-blue-700',
  CANCELLED: 'bg-red-100 text-red-700',
  COMPLETED: 'bg-blue-700 text-white',
};

export default function BookingsPage() {
  const [bookings, setBookings] = useState<BookingDTO[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [paymentForm, setPaymentForm] = useState({ type: 'CLIENT_RECEIPT', category: 'DMC', amount: '', couponCode: '' });
  const [vouchers, setVouchers] = useState<Record<string, VoucherDTO[]>>({});
  const [invoices, setInvoices] = useState<Record<string, InvoiceDTO[]>>({});
  const [linkBusy, setLinkBusy] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [reviews, setReviews] = useState<Record<string, ReviewDTO[]>>({});
  const [feedback, setFeedback] = useState<Record<string, TripFeedbackDTO[]>>({});
  const [policies, setPolicies] = useState<Record<string, InsurancePolicyDTO[]>>({});
  const [reviewForm, setReviewForm] = useState({ rating: '5', comment: '' });
  const [feedbackForm, setFeedbackForm] = useState({ overallSatisfaction: '5', hotelRating: '', transportRating: '', guideRating: '', comments: '' });
  const [policyForm, setPolicyForm] = useState({ provider: '', policyNumber: '', premiumAmount: '', coverageAmount: '', startDate: '', endDate: '' });

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
        couponCode: paymentForm.couponCode || undefined,
      });
      setPaymentForm({ type: 'CLIENT_RECEIPT', category: 'DMC', amount: '', couponCode: '' });
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
      const [v, i, r, f, p] = await Promise.all([
        api.get<VoucherDTO[]>(`/bookings/${bookingId}/vouchers`),
        api.get<InvoiceDTO[]>(`/bookings/${bookingId}/invoices`),
        api.get<ReviewDTO[]>(`/reviews/booking/${bookingId}`),
        api.get<TripFeedbackDTO[]>(`/feedback/booking/${bookingId}`),
        api.get<InsurancePolicyDTO[]>(`/insurance/booking/${bookingId}`),
      ]);
      setVouchers((prev) => ({ ...prev, [bookingId]: v }));
      setInvoices((prev) => ({ ...prev, [bookingId]: i }));
      setReviews((prev) => ({ ...prev, [bookingId]: r }));
      setFeedback((prev) => ({ ...prev, [bookingId]: f }));
      setPolicies((prev) => ({ ...prev, [bookingId]: p }));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load booking details');
    }
  }

  async function handleAddReview(bookingId: string) {
    try {
      await api.post(`/reviews/booking/${bookingId}`, { rating: Number(reviewForm.rating), comment: reviewForm.comment || undefined });
      setReviewForm({ rating: '5', comment: '' });
      await loadDocs(bookingId);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to add review');
    }
  }

  async function handleAddFeedback(bookingId: string) {
    try {
      await api.post(`/feedback/booking/${bookingId}`, {
        overallSatisfaction: Number(feedbackForm.overallSatisfaction),
        hotelRating: feedbackForm.hotelRating ? Number(feedbackForm.hotelRating) : undefined,
        transportRating: feedbackForm.transportRating ? Number(feedbackForm.transportRating) : undefined,
        guideRating: feedbackForm.guideRating ? Number(feedbackForm.guideRating) : undefined,
        comments: feedbackForm.comments || undefined,
      });
      setFeedbackForm({ overallSatisfaction: '5', hotelRating: '', transportRating: '', guideRating: '', comments: '' });
      await loadDocs(bookingId);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to add feedback');
    }
  }

  async function handleAddPolicy(bookingId: string) {
    try {
      await api.post(`/insurance/booking/${bookingId}`, {
        provider: policyForm.provider,
        policyNumber: policyForm.policyNumber,
        premiumAmount: Number(policyForm.premiumAmount),
        coverageAmount: Number(policyForm.coverageAmount),
        startDate: policyForm.startDate,
        endDate: policyForm.endDate,
      });
      setPolicyForm({ provider: '', policyNumber: '', premiumAmount: '', coverageAmount: '', startDate: '', endDate: '' });
      await loadDocs(bookingId);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to add insurance policy');
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

  async function handleStatusChange(bookingId: string, status: string) {
    try {
      await api.patch(`/bookings/${bookingId}/status`, { status });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to update booking status');
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
          <div key={b.id} className="border-l-4 border-l-blue-500 bg-white p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-slate-800">{b.quotation?.lead?.clientName} · {b.quotation?.lead?.destination}</p>
                <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
                  Departs {new Date(b.departureDate).toLocaleDateString()} ·
                  <select
                    value={b.status}
                    onChange={(e) => handleStatusChange(b.id, e.target.value)}
                    className={`rounded-full border-none px-2 py-0.5 text-xs font-medium ${BOOKING_STATUS_COLORS[b.status] ?? 'bg-slate-100 text-slate-600'}`}
                  >
                    {BOOKING_STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
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
                        <td className="py-1">
                          ₹{Number(p.amount).toLocaleString('en-IN')}
                          {p.discountAmount != null && (
                            <span className="ml-1.5 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                              -₹{Number(p.discountAmount).toLocaleString('en-IN')} coupon
                            </span>
                          )}
                        </td>
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
                  {paymentForm.type === 'CLIENT_RECEIPT' && (
                    <input type="text" placeholder="Coupon code (optional)" value={paymentForm.couponCode} onChange={(e) => setPaymentForm({ ...paymentForm, couponCode: e.target.value.toUpperCase() })} className="w-40 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-100 transition-colors" />
                  )}
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

                <div className="mt-4 border-t border-slate-100 pt-3 dark:border-slate-700">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Reviews</p>
                  <ul className="mt-1 space-y-1">
                    {(reviews[b.id] ?? []).map((r) => (
                      <li key={r.id} className="text-sm text-slate-700 dark:text-slate-200">
                        {'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}{' '}
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-700 dark:text-slate-300">{r.status}</span>{' '}
                        {r.comment && <span className="text-slate-500 dark:text-slate-400">— {r.comment}</span>}
                      </li>
                    ))}
                    {(!reviews[b.id] || reviews[b.id].length === 0) && <li className="text-sm text-slate-400">No reviews yet.</li>}
                  </ul>
                  <div className="mt-2 flex items-end gap-2">
                    <select value={reviewForm.rating} onChange={(e) => setReviewForm({ ...reviewForm, rating: e.target.value })} className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-100 transition-colors">
                      {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n} ★</option>)}
                    </select>
                    <input type="text" placeholder="Comment (optional)" value={reviewForm.comment} onChange={(e) => setReviewForm({ ...reviewForm, comment: e.target.value })} className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-100 transition-colors" />
                    <button onClick={() => handleAddReview(b.id)} className="rounded-lg bg-brand px-3 py-2 text-sm font-medium text-white hover:bg-brand-dark">Add review</button>
                  </div>
                </div>

                <div className="mt-4 border-t border-slate-100 pt-3 dark:border-slate-700">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Post-trip feedback</p>
                  <ul className="mt-1 space-y-1">
                    {(feedback[b.id] ?? []).map((f) => (
                      <li key={f.id} className="text-sm text-slate-700 dark:text-slate-200">
                        Overall {f.overallSatisfaction}/5
                        {f.hotelRating != null && ` · Hotel ${f.hotelRating}/5`}
                        {f.transportRating != null && ` · Transport ${f.transportRating}/5`}
                        {f.guideRating != null && ` · Guide ${f.guideRating}/5`}
                        {f.comments && <span className="text-slate-500 dark:text-slate-400"> — {f.comments}</span>}
                      </li>
                    ))}
                    {(!feedback[b.id] || feedback[b.id].length === 0) && <li className="text-sm text-slate-400">No feedback submitted yet.</li>}
                  </ul>
                  <div className="mt-2 flex flex-wrap items-end gap-2">
                    <select value={feedbackForm.overallSatisfaction} onChange={(e) => setFeedbackForm({ ...feedbackForm, overallSatisfaction: e.target.value })} className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-100 transition-colors">
                      {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>Overall {n}/5</option>)}
                    </select>
                    <input type="number" min={1} max={5} placeholder="Hotel" value={feedbackForm.hotelRating} onChange={(e) => setFeedbackForm({ ...feedbackForm, hotelRating: e.target.value })} className="w-20 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-100 transition-colors" />
                    <input type="number" min={1} max={5} placeholder="Transport" value={feedbackForm.transportRating} onChange={(e) => setFeedbackForm({ ...feedbackForm, transportRating: e.target.value })} className="w-24 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-100 transition-colors" />
                    <input type="number" min={1} max={5} placeholder="Guide" value={feedbackForm.guideRating} onChange={(e) => setFeedbackForm({ ...feedbackForm, guideRating: e.target.value })} className="w-20 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-100 transition-colors" />
                    <input type="text" placeholder="Comments" value={feedbackForm.comments} onChange={(e) => setFeedbackForm({ ...feedbackForm, comments: e.target.value })} className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-100 transition-colors" />
                    <button onClick={() => handleAddFeedback(b.id)} className="rounded-lg bg-brand px-3 py-2 text-sm font-medium text-white hover:bg-brand-dark">Add feedback</button>
                  </div>
                </div>

                <div className="mt-4 border-t border-slate-100 pt-3 dark:border-slate-700">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Travel insurance</p>
                  <ul className="mt-1 space-y-1">
                    {(policies[b.id] ?? []).map((p) => (
                      <li key={p.id} className="text-sm text-slate-700 dark:text-slate-200">
                        {p.provider} #{p.policyNumber} · Cover ₹{Number(p.coverageAmount).toLocaleString('en-IN')} · Premium ₹{Number(p.premiumAmount).toLocaleString('en-IN')}{' '}
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-700 dark:text-slate-300">{p.status}</span>
                      </li>
                    ))}
                    {(!policies[b.id] || policies[b.id].length === 0) && <li className="text-sm text-slate-400">No policy added yet.</li>}
                  </ul>
                  <div className="mt-2 flex flex-wrap items-end gap-2">
                    <input type="text" placeholder="Provider" value={policyForm.provider} onChange={(e) => setPolicyForm({ ...policyForm, provider: e.target.value })} className="w-28 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-100 transition-colors" />
                    <input type="text" placeholder="Policy #" value={policyForm.policyNumber} onChange={(e) => setPolicyForm({ ...policyForm, policyNumber: e.target.value })} className="w-28 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-100 transition-colors" />
                    <input type="number" placeholder="Premium" value={policyForm.premiumAmount} onChange={(e) => setPolicyForm({ ...policyForm, premiumAmount: e.target.value })} className="w-24 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-100 transition-colors" />
                    <input type="number" placeholder="Coverage" value={policyForm.coverageAmount} onChange={(e) => setPolicyForm({ ...policyForm, coverageAmount: e.target.value })} className="w-24 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-100 transition-colors" />
                    <input type="date" value={policyForm.startDate} onChange={(e) => setPolicyForm({ ...policyForm, startDate: e.target.value })} className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-100 transition-colors" />
                    <input type="date" value={policyForm.endDate} onChange={(e) => setPolicyForm({ ...policyForm, endDate: e.target.value })} className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-100 transition-colors" />
                    <button onClick={() => handleAddPolicy(b.id)} className="rounded-lg bg-brand px-3 py-2 text-sm font-medium text-white hover:bg-brand-dark">Add policy</button>
                  </div>
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
