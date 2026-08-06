'use client';

import { FormEvent, useEffect, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { useAuth } from '@/lib/auth-context';
import { api, ApiError } from '@/lib/api';
import { Role, type PayslipDTO, type SalaryStructureDTO, type UserDTO } from '@holiday-vibez/shared';

function currentMonth() {
  return new Date().toISOString().slice(0, 7);
}

export default function PayrollPage() {
  const { user: me } = useAuth();
  const canManage = me?.role === Role.ADMIN || me?.role === Role.DIRECTOR;
  const canSeeTeam = canManage || me?.role === Role.BRANCH_MANAGER;

  const [employees, setEmployees] = useState<UserDTO[]>([]);
  const [structures, setStructures] = useState<SalaryStructureDTO[]>([]);
  const [mine, setMine] = useState<PayslipDTO[]>([]);
  const [team, setTeam] = useState<PayslipDTO[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [structureForm, setStructureForm] = useState({ userId: '', basicSalary: '', hra: '', allowances: '' });
  const [genForm, setGenForm] = useState({ userId: '', month: currentMonth(), incentive: '' });
  const [teamMonth, setTeamMonth] = useState(currentMonth());

  async function load() {
    try {
      setMine(await api.get<PayslipDTO[]>('/payroll/payslips/me'));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load payslips');
    }
    if (canManage) {
      try {
        setEmployees(await api.get<UserDTO[]>('/users'));
        setStructures(await api.get<SalaryStructureDTO[]>('/payroll/salary-structure'));
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'Failed to load salary data');
      }
    }
    if (canSeeTeam) {
      try {
        setTeam(await api.get<PayslipDTO[]>(`/payroll/payslips?month=${teamMonth}`));
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'Failed to load team payslips');
      }
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamMonth, me?.role]);

  async function handleSaveStructure(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api.put(`/payroll/salary-structure/${structureForm.userId}`, {
        basicSalary: Number(structureForm.basicSalary),
        hra: Number(structureForm.hra || 0),
        allowances: Number(structureForm.allowances || 0),
      });
      setStructureForm({ userId: '', basicSalary: '', hra: '', allowances: '' });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to save salary structure');
    }
  }

  async function handleGenerate(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api.post('/payroll/payslips/generate', {
        userId: genForm.userId,
        month: genForm.month,
        incentive: genForm.incentive ? Number(genForm.incentive) : undefined,
      });
      setGenForm({ userId: '', month: currentMonth(), incentive: '' });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to generate payslip');
    }
  }

  return (
    <AppShell>
      <h1 className="inline-block rounded-lg bg-white px-4 py-2 text-xl font-bold tracking-tight text-brand shadow-card">Payroll</h1>
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      {canManage && (
        <>
          <h2 className="mt-6 text-sm font-semibold text-white">Salary structures</h2>
          <form onSubmit={handleSaveStructure} className="mt-2 grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-white shadow-card p-4 sm:grid-cols-2 lg:grid-cols-4">
            <select required value={structureForm.userId} onChange={(e) => setStructureForm({ ...structureForm, userId: e.target.value })} className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-100 transition-colors">
              <option value="">Select employee</option>
              {employees.map((emp) => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
            </select>
            <input required type="number" min="0" placeholder="Basic salary" value={structureForm.basicSalary} onChange={(e) => setStructureForm({ ...structureForm, basicSalary: e.target.value })} className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-100 transition-colors" />
            <input type="number" min="0" placeholder="HRA" value={structureForm.hra} onChange={(e) => setStructureForm({ ...structureForm, hra: e.target.value })} className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-100 transition-colors" />
            <input type="number" min="0" placeholder="Allowances" value={structureForm.allowances} onChange={(e) => setStructureForm({ ...structureForm, allowances: e.target.value })} className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-100 transition-colors" />
            <button type="submit" className="rounded-lg bg-brand px-3 py-2 text-sm font-medium text-white hover:bg-brand-dark sm:col-span-2 lg:col-span-4">
              Save salary structure
            </button>
          </form>

          <div className="mt-2 overflow-hidden bg-white">
            <table className="w-full text-sm">
              <thead className="bg-brand-50/60 text-left text-xs font-semibold uppercase tracking-wide text-brand-700">
                <tr>
                  <th className="px-4 py-2">Employee</th>
                  <th className="px-4 py-2">Basic</th>
                  <th className="px-4 py-2">HRA</th>
                  <th className="px-4 py-2">Allowances</th>
                </tr>
              </thead>
              <tbody>
                {structures.map((s) => (
                  <tr key={s.id} className="border-t border-slate-100">
                    <td className="px-4 py-2 font-medium text-slate-800">{s.user?.name}</td>
                    <td className="px-4 py-2">₹{s.basicSalary.toLocaleString('en-IN')}</td>
                    <td className="px-4 py-2">₹{s.hra.toLocaleString('en-IN')}</td>
                    <td className="px-4 py-2">₹{s.allowances.toLocaleString('en-IN')}</td>
                  </tr>
                ))}
                {structures.length === 0 && (
                  <tr><td colSpan={4} className="px-4 py-6 text-center text-slate-400">No salary structures configured yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>

          <h2 className="mt-6 text-sm font-semibold text-white">Generate payslip</h2>
          <form onSubmit={handleGenerate} className="mt-2 grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-white shadow-card p-4 sm:grid-cols-2 lg:grid-cols-4">
            <select required value={genForm.userId} onChange={(e) => setGenForm({ ...genForm, userId: e.target.value })} className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-100 transition-colors">
              <option value="">Select employee</option>
              {employees.map((emp) => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
            </select>
            <input required type="month" value={genForm.month} onChange={(e) => setGenForm({ ...genForm, month: e.target.value })} className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-100 transition-colors" />
            <input type="number" min="0" placeholder="Incentive (optional)" value={genForm.incentive} onChange={(e) => setGenForm({ ...genForm, incentive: e.target.value })} className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-100 transition-colors" />
            <button type="submit" className="rounded-lg bg-brand px-3 py-2 text-sm font-medium text-white hover:bg-brand-dark">
              Generate
            </button>
          </form>
          <p className="mt-1 text-xs text-blue-100">
            Present days and paid-leave days come from Attendance and approved Leave requests for that month; remaining days are treated as loss-of-pay and deducted pro-rata from basic salary.
          </p>
        </>
      )}

      <h2 className="mt-6 text-sm font-semibold text-white">My payslips</h2>
      <div className="mt-2 overflow-hidden bg-white">
        <table className="w-full text-sm">
          <thead className="bg-brand-50/60 text-left text-xs font-semibold uppercase tracking-wide text-brand-700">
            <tr>
              <th className="px-4 py-2">Month</th>
              <th className="px-4 py-2">Present days</th>
              <th className="px-4 py-2">LOP days</th>
              <th className="px-4 py-2">Net pay</th>
              <th className="px-4 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {mine.map((p) => (
              <tr key={p.id} className="border-t border-slate-100">
                <td className="px-4 py-2 font-medium text-slate-800">{p.month}</td>
                <td className="px-4 py-2">{p.presentDays}</td>
                <td className="px-4 py-2">{p.lopDays}</td>
                <td className="px-4 py-2">₹{p.netPay.toLocaleString('en-IN')}</td>
                <td className="px-4 py-2 text-right">
                  <a href={`${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api'}/payroll/payslips/${p.id}/pdf`} target="_blank" rel="noopener noreferrer" className="text-brand hover:underline">
                    Download
                  </a>
                </td>
              </tr>
            ))}
            {mine.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-6 text-center text-slate-400">No payslips yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {canSeeTeam && (
        <>
          <div className="mt-6 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white">Team payslips</h2>
            <input type="month" value={teamMonth} onChange={(e) => setTeamMonth(e.target.value)} className="rounded-lg border border-slate-300 px-2 py-1 text-sm" />
          </div>
          <div className="mt-2 overflow-hidden bg-white">
            <table className="w-full text-sm">
              <thead className="bg-brand-50/60 text-left text-xs font-semibold uppercase tracking-wide text-brand-700">
                <tr>
                  <th className="px-4 py-2">Employee</th>
                  <th className="px-4 py-2">Month</th>
                  <th className="px-4 py-2">Net pay</th>
                  <th className="px-4 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {team.map((p) => (
                  <tr key={p.id} className="border-t border-slate-100">
                    <td className="px-4 py-2 font-medium text-slate-800">{p.user?.name}</td>
                    <td className="px-4 py-2">{p.month}</td>
                    <td className="px-4 py-2">₹{p.netPay.toLocaleString('en-IN')}</td>
                    <td className="px-4 py-2 text-right">
                      <a href={`${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api'}/payroll/payslips/${p.id}/pdf`} target="_blank" rel="noopener noreferrer" className="text-brand hover:underline">
                        Download
                      </a>
                    </td>
                  </tr>
                ))}
                {team.length === 0 && (
                  <tr><td colSpan={4} className="px-4 py-6 text-center text-slate-400">No payslips for this month.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </AppShell>
  );
}
