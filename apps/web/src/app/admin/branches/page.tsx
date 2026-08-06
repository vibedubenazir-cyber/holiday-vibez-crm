'use client';

import { FormEvent, useEffect, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { useAuth } from '@/lib/auth-context';
import { api, ApiError } from '@/lib/api';
import { Role, type BranchDTO } from '@holiday-vibez/shared';

export default function BranchesPage() {
  const { user: me } = useAuth();
  const [branches, setBranches] = useState<BranchDTO[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const isAdmin = me?.role === Role.ADMIN;

  const [form, setForm] = useState({ name: '', city: '', monthlyTarget: '', quarterlyTarget: '' });

  async function load() {
    try {
      setBranches(await api.get<BranchDTO[]>('/branches'));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load branches');
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api.post('/branches', {
        name: form.name,
        city: form.city,
        monthlyTarget: form.monthlyTarget ? Number(form.monthlyTarget) : undefined,
        quarterlyTarget: form.quarterlyTarget ? Number(form.quarterlyTarget) : undefined,
      });
      setForm({ name: '', city: '', monthlyTarget: '', quarterlyTarget: '' });
      setShowForm(false);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to create branch');
    }
  }

  return (
    <AppShell>
      <div className="flex items-center justify-between">
        <h1 className="inline-block rounded-lg bg-brand px-4 py-2 text-xl font-bold tracking-tight text-white shadow-card">Branches</h1>
        {isAdmin && (
          <button
            onClick={() => setShowForm((s) => !s)}
            className="rounded-lg bg-gradient-to-r from-brand to-brand-500 px-3 py-1.5 text-sm font-medium text-white shadow-card transition-all hover:shadow-card-hover hover:brightness-105"
          >
            {showForm ? 'Cancel' : 'Add branch'}
          </button>
        )}
      </div>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      {isAdmin && showForm && (
        <form onSubmit={handleCreate} className="mt-4 grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-white shadow-card transition-shadow hover:shadow-card-hover p-4 sm:grid-cols-2 lg:grid-cols-4">
          <input required placeholder="Branch name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-100 transition-colors" />
          <input required placeholder="City" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-100 transition-colors" />
          <input placeholder="Monthly target" type="number" value={form.monthlyTarget} onChange={(e) => setForm({ ...form, monthlyTarget: e.target.value })} className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-100 transition-colors" />
          <input placeholder="Quarterly target" type="number" value={form.quarterlyTarget} onChange={(e) => setForm({ ...form, quarterlyTarget: e.target.value })} className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-100 transition-colors" />
          <button type="submit" className="rounded-lg bg-brand px-3 py-2 text-sm font-medium text-white hover:bg-brand-dark sm:col-span-2 lg:col-span-4">
            Create branch
          </button>
        </form>
      )}

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {branches.map((b) => (
          <div key={b.id} className="rounded-xl border border-slate-200 bg-white shadow-card transition-shadow hover:shadow-card-hover p-4">
            <p className="text-base font-medium text-slate-800">{b.name}</p>
            <p className="text-sm text-slate-500">{b.city}</p>
            <div className="mt-3 flex justify-between text-xs text-slate-500">
              <span>Monthly target</span>
              <span className="font-medium text-slate-700">₹{Number(b.monthlyTarget).toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between text-xs text-slate-500">
              <span>Quarterly target</span>
              <span className="font-medium text-slate-700">₹{Number(b.quarterlyTarget).toLocaleString('en-IN')}</span>
            </div>
          </div>
        ))}
      </div>
    </AppShell>
  );
}
