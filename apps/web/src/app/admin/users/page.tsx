'use client';

import { FormEvent, useEffect, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { PhoneInput } from '@/components/PhoneInput';
import { useAuth } from '@/lib/auth-context';
import { api, ApiError } from '@/lib/api';
import { Role, UserStatus, type BranchDTO, type UserDTO } from '@holiday-vibez/shared';

const ROLE_OPTIONS = [Role.DIRECTOR, Role.ADMIN, Role.BRANCH_MANAGER, Role.TRAVEL_CONSULTANT, Role.FINANCE, Role.AUDITOR];

const ROLE_BADGE: Record<string, string> = {
  DIRECTOR: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
  ADMIN: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300',
  BRANCH_MANAGER: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300',
  TRAVEL_CONSULTANT: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  FINANCE: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  AUDITOR: 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300',
};

const STATUS_BADGE: Record<string, string> = {
  ACTIVE: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  ON_LEAVE: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  INACTIVE: 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
};

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
        <h1 className="text-2xl font-extrabold tracking-tight text-brand-700">Users</h1>
        {isAdmin && (
          <button
            onClick={() => setShowForm((s) => !s)}
            className="rounded-xl bg-gradient-to-br from-brand-600 to-brand-500 px-3 py-1.5 text-sm font-semibold text-white shadow-md shadow-brand-500/25 transition hover:opacity-90"
          >
            {showForm ? 'Cancel' : 'Add user'}
          </button>
        )}
      </div>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      {isAdmin && showForm && (
        <form onSubmit={handleCreate} className="mt-4 grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-white dark:bg-slate-800 shadow-card transition-shadow hover:shadow-card-hover p-4 sm:grid-cols-2 lg:grid-cols-3">
          <input required placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-100 transition-colors" />
          <input required type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-100 transition-colors" />
          <PhoneInput required value={form.phone} onChange={(phone) => setForm({ ...form, phone })} />
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
          <button type="submit" className="rounded-xl bg-gradient-to-br from-brand-600 to-brand-500 shadow-md shadow-brand-500/25 px-3 py-2 text-sm font-medium text-white hover:opacity-90 sm:col-span-2 lg:col-span-3">
            Create user
          </button>
        </form>
      )}

      <div className="mt-4 overflow-x-auto bg-white dark:bg-slate-800">
        <table className="w-full min-w-[720px] text-sm lg:min-w-0">
          <thead className="bg-brand-50/60 text-left text-xs font-semibold uppercase tracking-wide text-brand-700 dark:bg-slate-900/40 dark:text-brand-300">
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
                <td className="px-4 py-2 font-medium text-slate-800 dark:text-slate-100">{u.name}</td>
                <td className="px-4 py-2 text-slate-500 dark:text-slate-400">{u.email}</td>
                <td className="px-4 py-2">
                  <span className={`rounded-lg px-2 py-0.5 text-xs font-medium ${ROLE_BADGE[u.role] ?? 'bg-slate-200 text-slate-600'}`}>
                    {u.role.replaceAll('_', ' ')}
                  </span>
                </td>
                <td className="px-4 py-2 text-slate-600 dark:text-slate-300">{branchName(u.branchId)}</td>
                <td className="px-4 py-2">
                  <span className={`rounded-lg px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[u.status] ?? 'bg-slate-200 text-slate-600'}`}>
                    {u.status.replaceAll('_', ' ')}
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
