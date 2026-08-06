'use client';

import { useEffect, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { api, ApiError } from '@/lib/api';
import type { AuditLogDTO, DataAdminStatsDTO } from '@holiday-vibez/shared';

const STAT_LABELS: Record<keyof DataAdminStatsDTO, string> = {
  users: 'Users',
  leads: 'Leads',
  quotations: 'Quotations',
  bookings: 'Bookings',
  payments: 'Payments',
  auditLogs: 'Audit Log Entries',
  cmsContent: 'CMS Content Items',
  currencyRates: 'Currency Rates',
};

const STAT_BORDER_COLORS = ['border-t-brand', 'border-t-blue-500', 'border-t-blue-500', 'border-t-brand-500', 'border-t-blue-500', 'border-t-blue-500', 'border-t-blue-500', 'border-t-blue-500'];

export default function DataAdminPage() {
  const [stats, setStats] = useState<DataAdminStatsDTO | null>(null);
  const [logs, setLogs] = useState<AuditLogDTO[]>([]);
  const [entityFilter, setEntityFilter] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function loadStats() {
    try {
      setStats(await api.get<DataAdminStatsDTO>('/data-admin/stats'));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load stats');
    }
  }

  async function loadLogs() {
    try {
      const query = entityFilter ? `?entity=${encodeURIComponent(entityFilter)}` : '';
      setLogs(await api.get<AuditLogDTO[]>(`/data-admin/audit-logs${query}`));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load audit logs');
    }
  }

  useEffect(() => {
    loadStats();
  }, []);

  useEffect(() => {
    loadLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityFilter]);

  return (
    <AppShell>
      <h1 className="inline-block rounded-lg bg-brand px-4 py-2 text-xl font-bold tracking-tight text-white shadow-card">Data Admin</h1>
      <p className="mt-1 text-sm text-slate-500">Operational health stats and a searchable log of every create/update/delete action across the CRM.</p>
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      {stats && (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {(Object.keys(STAT_LABELS) as (keyof DataAdminStatsDTO)[]).map((key, i) => (
            <div key={key} className={`rounded-xl border-t-4 ${STAT_BORDER_COLORS[i % STAT_BORDER_COLORS.length]} border-x border-b border-slate-200 bg-white shadow-card transition-shadow hover:shadow-card-hover p-4`}>
              <p className="text-2xl font-semibold text-slate-800">{stats[key]}</p>
              <p className="text-xs text-slate-500">{STAT_LABELS[key]}</p>
            </div>
          ))}
        </div>
      )}

      <div className="mt-8 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-800">Audit Log</h2>
        <input
          value={entityFilter}
          onChange={(e) => setEntityFilter(e.target.value)}
          placeholder="Filter by entity (e.g. leads, bookings)"
          className="w-64 rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-100 transition-colors"
        />
      </div>

      <div className="mt-3 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-card transition-shadow hover:shadow-card-hover">
        <table className="w-full text-sm">
          <thead className="bg-brand-50/60 text-left text-xs font-semibold uppercase tracking-wide text-brand-700">
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
              <tr key={log.id} className="border-t border-slate-100">
                <td className="px-4 py-2 text-slate-500">{new Date(log.createdAt).toLocaleString()}</td>
                <td className="px-4 py-2">{log.user?.name ?? '—'}</td>
                <td className="px-4 py-2">{log.action}</td>
                <td className="px-4 py-2">{log.entity}</td>
                <td className="px-4 py-2 text-xs text-slate-400">{log.entityId ?? '—'}</td>
              </tr>
            ))}
            {logs.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-slate-400">
                  No audit log entries found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}
