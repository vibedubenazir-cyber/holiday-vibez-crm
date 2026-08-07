'use client';

import { FormEvent, useEffect, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { useAuth } from '@/lib/auth-context';
import { api, ApiError } from '@/lib/api';
import { Role, UserStatus, type BranchDTO, type UserDTO } from '@holiday-vibez/shared';

const ROLE_OPTIONS = [Role.DIRECTOR, Role.ADMIN, Role.BRANCH_MANAGER, Role.TRAVEL_CONSULTANT];

export default function UsersPage() {
  const { user: me } = useAuth();
  const [users, setUsers] = useState<UserDTO[]>([]);
  const [branches, setBranches] = useState<BranchDTO[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const isAdmin = me?.role === Role.ADMIN;

  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    role: Role.TRAVEL_CONSULTANT as string,
    branchId: '',
  });

  async function load() {
    try {
      const [u, b] = await Promise.all([
        api.get<UserDTO[]>('/users'),
        api.get<BranchDTO[]>('/branches'),
      ]);
      setUsers(u);
      setBranches(b);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load users');
    }
  }

  useEffect(() => {
    load();
  }, []);

  function branchName(id: string | null) {
    return branches.find((b) => b.id === id)?.name ?? '—';
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api.post('/users', { ...form, branchId: form.branchId || undefined });
      setForm({ name: '', email: '', phone: '', password: '', role: Role.TRAVEL_CONSULTANT, branchId: '' });
      setShowForm(false);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to create user');
    }
  }

  async function handleDeactivate(id: string) {
    try {
      await api.patch(`/users/${id}/deactivate`);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to deactivate user');
    }
  }

  async function handleStatusToggle(u: UserDTO) {
    try {
      const nextStatus = u.status === UserStatus.ACTIVE ? UserStatus.ON_LEAVE : UserStatus.ACTIVE;
      await api.patch(`/users/${u.id}`, { status: nextStatus });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to update user');
    }
  }

  return (
    <AppShell>
      <div className="flex items-center justify-between">
        <h1 className="inline-block rounded-lg bg-white px-4 py-2 text-xl font-bold tracking-tight text-brand shadow-card">Users</h1>
        {isAdmin && (
          <button
            onClick={() => setShowForm((s) => !s)}
            className="rounded-lg bg-gradient-to-r from-brand to-brand-500 px-3 py-1.5 text-sm font-medium text-white shadow-card transition-all hover:shadow-card-hover hover:brightness-105"
          >
            {showForm ? 'Cancel' : 'Add user'}
          </button>
        )}
      </div>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      {isAdmin && showForm && (
        <form onSubmit={handleCreate} className="mt-4 grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-white shadow-card transition-shadow hover:shadow-card-hover p-4 sm:grid-cols-2 lg:grid-cols-3">
          <input required placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-100 transition-colors" />
          <input required type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-100 transition-colors" />
          <input required placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-100 transition-colors" />
          <input required type="password" placeholder="Temporary password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-100 transition-colors" />
          <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-100 transition-colors">
            {ROLE_OPTIONS.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
          <select value={form.branchId} onChange={(e) => setForm({ ...form, branchId: e.target.value })} className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-100 transition-colors">
            <option value="">No branch</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
          <button type="submit" className="rounded-lg bg-brand px-3 py-2 text-sm font-medium text-white hover:bg-brand-dark sm:col-span-2 lg:col-span-3">
            Create user
          </button>
        </form>
      )}

      <div className="mt-4 overflow-hidden bg-white">
        <table className="w-full text-sm">
          <thead className="bg-brand-50/60 text-left text-xs font-semibold uppercase tracking-wide text-brand-700">
            <tr>
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Email</th>
              <th className="px-4 py-2">Role</th>
              <th className="px-4 py-2">Branch</th>
              <th className="px-4 py-2">Status</th>
              {isAdmin && <th className="px-4 py-2 text-right">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-t border-slate-100">
                <td className="px-4 py-2">{u.name}</td>
                <td className="px-4 py-2 text-slate-500">{u.email}</td>
                <td className="px-4 py-2">{u.role}</td>
                <td className="px-4 py-2">{branchName(u.branchId)}</td>
                <td className="px-4 py-2">
                  <span className={`rounded-lg px-2 py-0.5 text-xs font-medium ${
                    u.status === 'ACTIVE' ? 'bg-blue-100 text-blue-700' :
                    u.status === 'ON_LEAVE' ? 'bg-blue-100 text-blue-700' : 'bg-slate-200 text-slate-600'
                  }`}>
                    {u.status}
                  </span>
                </td>
                {isAdmin && (
                  <td className="px-4 py-2 text-right">
                    <button onClick={() => handleStatusToggle(u)} className="mr-3 text-brand hover:underline">
                      {u.status === 'ACTIVE' ? 'Mark on leave' : 'Mark active'}
                    </button>
                    <button onClick={() => handleDeactivate(u.id)} className="text-red-600 hover:underline">
                      Deactivate
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}
