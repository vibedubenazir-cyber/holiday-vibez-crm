'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { useAuth } from '@/lib/auth-context';
import { api, ApiError } from '@/lib/api';
import { Role, type EmployeeDTO, type OrgChartNodeDTO } from '@holiday-vibez/shared';

const ROLE_LABELS: Record<string, string> = {
  DIRECTOR: 'Director',
  ADMIN: 'Admin',
  BRANCH_MANAGER: 'Branch Manager',
  TRAVEL_CONSULTANT: 'Travel Consultant',
  FINANCE: 'Finance',
  AUDITOR: 'Auditor',
};

function initials(name: string) {
  return name.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]!.toUpperCase()).join('');
}

function OrgChartTree({ node, employees }: { node: OrgChartNodeDTO; employees: EmployeeDTO[] }) {
  const full = employees.find((e) => e.id === node.id);
  return (
    <li className="mt-1">
      <div className="flex items-center gap-2 rounded-lg bg-white p-2 shadow-card dark:bg-slate-800">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-100 text-xs font-semibold text-brand-700 dark:bg-slate-700 dark:text-brand-200">
          {initials(node.name)}
        </div>
        <div>
          <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{node.name}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">{node.designation ?? ROLE_LABELS[node.role] ?? node.role}{full?.branchName ? ` · ${full.branchName}` : ''}</p>
        </div>
      </div>
      {node.children.length > 0 && (
        <ul className="ml-6 mt-1 border-l border-slate-200 pl-4 dark:border-slate-700">
          {node.children.map((c) => (
            <OrgChartTree key={c.id} node={c} employees={employees} />
          ))}
        </ul>
      )}
    </li>
  );
}

export default function EmployeesPage() {
  const { user: me } = useAuth();
  const canEdit = me?.role === Role.ADMIN || me?.role === Role.DIRECTOR;

  const [view, setView] = useState<'directory' | 'orgchart'>('directory');
  const [employees, setEmployees] = useState<EmployeeDTO[]>([]);
  const [orgChart, setOrgChart] = useState<OrgChartNodeDTO[]>([]);
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ designation: '', employeeCode: '', dateOfJoining: '', reportsToId: '' });

  async function load() {
    try {
      const [e, o] = await Promise.all([
        api.get<EmployeeDTO[]>('/employees'),
        api.get<OrgChartNodeDTO[]>('/employees/org-chart'),
      ]);
      setEmployees(e);
      setOrgChart(o);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load employees');
    }
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return employees;
    return employees.filter((e) =>
      e.name.toLowerCase().includes(q) ||
      (e.designation ?? '').toLowerCase().includes(q) ||
      (e.branchName ?? '').toLowerCase().includes(q) ||
      ROLE_LABELS[e.role]?.toLowerCase().includes(q),
    );
  }, [employees, search]);

  function startEdit(emp: EmployeeDTO) {
    setEditingId(emp.id);
    setEditForm({
      designation: emp.designation ?? '',
      employeeCode: emp.employeeCode ?? '',
      dateOfJoining: emp.dateOfJoining ? emp.dateOfJoining.slice(0, 10) : '',
      reportsToId: emp.reportsToId ?? '',
    });
  }

  async function saveEdit(e: FormEvent) {
    e.preventDefault();
    if (!editingId) return;
    setError(null);
    try {
      await api.patch(`/employees/${editingId}`, {
        designation: editForm.designation || undefined,
        employeeCode: editForm.employeeCode || undefined,
        dateOfJoining: editForm.dateOfJoining || undefined,
        reportsToId: editForm.reportsToId || undefined,
      });
      setEditingId(null);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to update employee');
    }
  }

  return (
    <AppShell>
      <div className="flex items-center justify-between">
        <h1 className="inline-block rounded-lg bg-brand-50 px-4 py-2 text-xl font-bold tracking-tight text-brand shadow-card">Employee Directory</h1>
        <div className="flex gap-1.5">
          <button onClick={() => setView('directory')} className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${view === 'directory' ? 'bg-brand text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300'}`}>Directory</button>
          <button onClick={() => setView('orgchart')} className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${view === 'orgchart' ? 'bg-brand text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300'}`}>Org Chart</button>
        </div>
      </div>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Browse everyone at Holiday Vibez, across every branch.</p>
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      {view === 'directory' ? (
        <>
          <input
            placeholder="Search by name, designation, or branch..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="mt-4 w-full max-w-md rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-100 transition-colors dark:border-slate-600 dark:bg-slate-900"
          />

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((emp) => (
              <div key={emp.id} className="rounded-lg bg-white p-4 shadow-card dark:bg-slate-800">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-100 text-sm font-semibold text-brand-700 dark:bg-slate-700 dark:text-brand-200">
                    {initials(emp.name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-slate-800 dark:text-slate-100">{emp.name}</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{emp.designation ?? ROLE_LABELS[emp.role] ?? emp.role}</p>
                    {emp.branchName && <p className="text-xs text-slate-400">{emp.branchName}</p>}
                  </div>
                </div>
                <div className="mt-2 space-y-0.5 text-xs text-slate-500 dark:text-slate-400">
                  <p>{emp.email}</p>
                  <p>{emp.phone}</p>
                  {emp.reportsToName && <p>Reports to {emp.reportsToName}</p>}
                  {emp.employeeCode && <p>ID: {emp.employeeCode}</p>}
                </div>
                {canEdit && (
                  <button onClick={() => startEdit(emp)} className="mt-2 text-xs text-brand hover:underline">Edit profile</button>
                )}
                {canEdit && editingId === emp.id && (
                  <form onSubmit={saveEdit} className="mt-2 flex flex-col gap-1.5 rounded-lg border border-slate-100 bg-slate-50/60 p-2.5 dark:border-slate-700 dark:bg-slate-900/30">
                    <input placeholder="Designation" value={editForm.designation} onChange={(e) => setEditForm({ ...editForm, designation: e.target.value })} className="rounded-lg border border-slate-300 px-2 py-1 text-xs focus:border-brand focus:outline-none dark:border-slate-600 dark:bg-slate-900" />
                    <input placeholder="Employee ID" value={editForm.employeeCode} onChange={(e) => setEditForm({ ...editForm, employeeCode: e.target.value })} className="rounded-lg border border-slate-300 px-2 py-1 text-xs focus:border-brand focus:outline-none dark:border-slate-600 dark:bg-slate-900" />
                    <input type="date" value={editForm.dateOfJoining} onChange={(e) => setEditForm({ ...editForm, dateOfJoining: e.target.value })} className="rounded-lg border border-slate-300 px-2 py-1 text-xs focus:border-brand focus:outline-none dark:border-slate-600 dark:bg-slate-900" />
                    <select value={editForm.reportsToId} onChange={(e) => setEditForm({ ...editForm, reportsToId: e.target.value })} className="rounded-lg border border-slate-300 px-2 py-1 text-xs focus:border-brand focus:outline-none dark:border-slate-600 dark:bg-slate-900">
                      <option value="">Reports to (none)</option>
                      {employees.filter((e) => e.id !== emp.id).map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
                    </select>
                    <div className="flex gap-2">
                      <button type="submit" className="rounded-lg bg-brand px-2 py-1 text-xs font-medium text-white hover:bg-brand-dark">Save</button>
                      <button type="button" onClick={() => setEditingId(null)} className="text-xs text-slate-500 hover:underline">Cancel</button>
                    </div>
                  </form>
                )}
              </div>
            ))}
            {filtered.length === 0 && <p className="col-span-full text-sm text-slate-400">No employees match your search.</p>}
          </div>
        </>
      ) : (
        <ul className="mt-4">
          {orgChart.map((root) => (
            <OrgChartTree key={root.id} node={root} employees={employees} />
          ))}
          {orgChart.length === 0 && <p className="text-sm text-slate-400">No org chart data yet.</p>}
        </ul>
      )}
    </AppShell>
  );
}
