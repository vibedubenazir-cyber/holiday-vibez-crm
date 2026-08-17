'use client';

import { useEffect, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { useAuth } from '@/lib/auth-context';
import { api, ApiError } from '@/lib/api';
import { Role, type AuditLogDTO } from '@holiday-vibez/shared';

const HR_ENTITIES = [
  { value: 'employees', label: 'Employees' },
  { value: 'exit-management', label: 'Exit Management' },
  { value: 'performance', label: 'Performance' },
  { value: 'reimbursements', label: 'Reimbursements' },
  { value: 'leave', label: 'Leave' },
  { value: 'attendance', label: 'Attendance' },
  { value: 'payroll', label: 'Payroll' },
  { value: 'hr-helpdesk', label: 'HR Helpdesk' },
  { value: 'grievances', label: 'Grievances & POSH' },
  { value: 'hr-settings', label: 'HR Settings' },
];

export default function HrAuditLogPage() {
  const { user: me } = useAuth();
  const canView = me?.role === Role.ADMIN || me?.role === Role.DIRECTOR;
  const [entity, setEntity] = useState(HR_ENTITIES[0].value);
  const [logs, setLogs] = useState<AuditLogDTO[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      setLogs(await api.get<AuditLogDTO[]>(`/data-admin/audit-logs?entity=${encodeURIComponent(entity)}`));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load audit log');
    }
  }

  useEffect(() => {
    if (canView) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entity, canView]);

  if (!canView) {
    return (
      <AppShell>
        <h1 className="text-2xl font-extrabold tracking-tight text-brand-700">HR Audit Log</h1>
        <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">Only Admin and Director can view the HR audit log.</p>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <h1 className="text-2xl font-extrabold tracking-tight text-brand-700">HR Audit Log</h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Every create/update/delete action across the HR modules, logged automatically.</p>
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      <div className="mt-4 flex flex-wrap gap-1 rounded-lg border border-slate-200 bg-white dark:bg-slate-800 dark:border-slate-700 p-1 text-sm">
        {HR_ENTITIES.map((e) => (
          <button
            key={e.value}
            onClick={() => setEntity(e.value)}
            className={`rounded px-3 py-1.5 font-medium ${entity === e.value ? 'bg-brand text-white' : 'text-slate-600 dark:text-slate-300'}`}
          >
            {e.label}
          </button>
        ))}
      </div>

      <div className="mt-3 overflow-hidden rounded-xl border border-slate-200 bg-white dark:bg-slate-800 dark:border-slate-700 shadow-card">
        <table className="w-full text-sm">
          <thead className="bg-brand-50/60 text-left text-xs font-semibold uppercase tracking-wide text-brand-700 dark:bg-slate-900/40 dark:text-brand-300">
            <tr>
              <th className="px-4 py-2">When</th>
              <th className="px-4 py-2">User</th>
              <th className="px-4 py-2">Action</th>
              <th className="px-4 py-2">Entity</th>
              <th className="px-4 py-2">Entity ID</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id} className="border-t border-slate-100 dark:border-slate-700">
                <td className="px-4 py-2 text-slate-500 dark:text-slate-400">{new Date(log.createdAt).toLocaleString()}</td>
                <td className="px-4 py-2 text-slate-700 dark:text-slate-200">{log.user?.name ?? '—'}</td>
                <td className="px-4 py-2 text-slate-700 dark:text-slate-200">{log.action}</td>
                <td className="px-4 py-2 text-slate-500 dark:text-slate-400">{log.entity}</td>
                <td className="px-4 py-2 text-xs text-slate-400">{log.entityId ?? '—'}</td>
              </tr>
            ))}
            {logs.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-6 text-center text-slate-400">No audit log entries for this area yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}
