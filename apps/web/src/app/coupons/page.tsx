'use client';

import { FormEvent, useEffect, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { useAuth } from '@/lib/auth-context';
import { api, ApiError } from '@/lib/api';
import { Role, CouponDiscountType, type CouponDTO } from '@holiday-vibez/shared';

export default function CouponsPage() {
  const { user: me } = useAuth();
  const [coupons, setCoupons] = useState<CouponDTO[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const isManager = me?.role === Role.ADMIN || me?.role === Role.DIRECTOR;

  const [form, setForm] = useState({
    code: '',
    discountType: CouponDiscountType.PERCENTAGE,
    discountValue: '',
    validFrom: '',
    validTo: '',
    usageLimit: '',
  });

  async function load() {
    try {
      setCoupons(await api.get<CouponDTO[]>('/coupons'));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load coupons');
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api.post('/coupons', {
        code: form.code,
        discountType: form.discountType,
        discountValue: Number(form.discountValue),
        validFrom: form.validFrom,
        validTo: form.validTo,
        usageLimit: form.usageLimit ? Number(form.usageLimit) : undefined,
      });
      setForm({ code: '', discountType: CouponDiscountType.PERCENTAGE, discountValue: '', validFrom: '', validTo: '', usageLimit: '' });
      setShowForm(false);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to create coupon');
    }
  }

  async function handleToggleActive(coupon: CouponDTO) {
    try {
      await api.patch(`/coupons/${coupon.id}/active`, { active: !coupon.active });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to update coupon');
    }
  }

  function isExpired(coupon: CouponDTO) {
    return new Date(coupon.validTo) < new Date();
  }

  return (
    <AppShell>
      <div className="flex items-center justify-between">
        <h1 className="inline-block rounded-lg bg-white px-4 py-2 text-xl font-bold tracking-tight text-brand shadow-card">Coupons & Offers</h1>
        {isManager && (
          <button onClick={() => setShowForm((s) => !s)} className="rounded-lg bg-gradient-to-r from-brand to-brand-500 px-3 py-1.5 text-sm font-medium text-white shadow-card transition-all hover:shadow-card-hover hover:brightness-105">
            {showForm ? 'Cancel' : 'Add coupon'}
          </button>
        )}
      </div>
      <p className="mt-1 text-sm text-blue-100">
        Discount codes applied at payment time. Percentage or fixed-amount, with optional validity window and usage limit.
      </p>
      {!isManager && <p className="mt-1 text-xs text-blue-100">Read-only — only Admin/Director can manage coupons.</p>}

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      {isManager && showForm && (
        <form onSubmit={handleCreate} className="mt-4 flex flex-wrap items-end gap-2 rounded-xl border border-slate-200 bg-white shadow-card transition-shadow hover:shadow-card-hover p-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-500">Code</label>
            <input
              required
              placeholder="SUMMER25"
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
              className="w-40 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-100 transition-colors"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-500">Type</label>
            <select
              value={form.discountType}
              onChange={(e) => setForm({ ...form, discountType: e.target.value as CouponDiscountType })}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-100 transition-colors"
            >
              <option value={CouponDiscountType.PERCENTAGE}>Percentage</option>
              <option value={CouponDiscountType.FIXED}>Fixed amount</option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-500">Value</label>
            <input
              required
              type="number"
              step="0.01"
              placeholder={form.discountType === CouponDiscountType.PERCENTAGE ? '%' : '₹'}
              value={form.discountValue}
              onChange={(e) => setForm({ ...form, discountValue: e.target.value })}
              className="w-24 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-100 transition-colors"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-500">Valid from</label>
            <input
              required
              type="date"
              value={form.validFrom}
              onChange={(e) => setForm({ ...form, validFrom: e.target.value })}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-100 transition-colors"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-500">Valid to</label>
            <input
              required
              type="date"
              value={form.validTo}
              onChange={(e) => setForm({ ...form, validTo: e.target.value })}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-100 transition-colors"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-500">Usage limit</label>
            <input
              type="number"
              min={1}
              placeholder="Unlimited"
              value={form.usageLimit}
              onChange={(e) => setForm({ ...form, usageLimit: e.target.value })}
              className="w-28 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-100 transition-colors"
            />
          </div>
          <button type="submit" className="rounded-lg bg-brand px-3 py-2 text-sm font-medium text-white hover:bg-brand-dark">Create</button>
        </form>
      )}

      <div className="mt-4 overflow-hidden bg-white">
        <table className="w-full text-sm">
          <thead className="bg-brand-50/60 text-left text-xs font-semibold uppercase tracking-wide text-brand-700">
            <tr>
              <th className="px-4 py-2">Code</th>
              <th className="px-4 py-2">Discount</th>
              <th className="px-4 py-2">Valid</th>
              <th className="px-4 py-2">Usage</th>
              <th className="px-4 py-2">Status</th>
              {isManager && <th className="px-4 py-2 text-right">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {coupons.map((c) => (
              <tr key={c.id} className="border-t border-slate-100">
                <td className="px-4 py-2 font-medium text-slate-800">{c.code}</td>
                <td className="px-4 py-2 text-slate-600">
                  {c.discountType === CouponDiscountType.PERCENTAGE ? `${Number(c.discountValue)}%` : `₹${Number(c.discountValue).toFixed(2)}`}
                </td>
                <td className="px-4 py-2 text-slate-500">
                  {new Date(c.validFrom).toLocaleDateString()} – {new Date(c.validTo).toLocaleDateString()}
                </td>
                <td className="px-4 py-2 text-slate-500">
                  {c.usedCount}{c.usageLimit ? ` / ${c.usageLimit}` : ''}
                </td>
                <td className="px-4 py-2">
                  <span
                    className={`rounded-lg px-2 py-0.5 text-xs font-medium ${
                      !c.active
                        ? 'bg-slate-200 text-slate-600'
                        : isExpired(c)
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-blue-100 text-blue-700'
                    }`}
                  >
                    {!c.active ? 'Inactive' : isExpired(c) ? 'Expired' : 'Active'}
                  </span>
                </td>
                {isManager && (
                  <td className="px-4 py-2 text-right">
                    <button onClick={() => handleToggleActive(c)} className="text-brand hover:underline">
                      {c.active ? 'Deactivate' : 'Activate'}
                    </button>
                  </td>
                )}
              </tr>
            ))}
            {coupons.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-6 text-center text-slate-400">No coupons yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}
