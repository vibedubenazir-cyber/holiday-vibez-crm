'use client';

import { FormEvent, useEffect, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { useAuth } from '@/lib/auth-context';
import { api, ApiError } from '@/lib/api';
import { uploadFile } from '@/lib/upload';
import { EmployeeDocumentType, Role, type EmployeeDTO, type EmployeeDocumentDTO } from '@holiday-vibez/shared';

const TYPE_LABELS: Record<string, string> = {
  AADHAAR: 'Aadhaar',
  PAN: 'PAN',
  PASSPORT: 'Passport',
  OFFER_LETTER: 'Offer Letter',
  CONTRACT: 'Contract',
  EDUCATION_CERTIFICATE: 'Education Certificate',
  BANK_PROOF: 'Bank Proof',
  OTHER: 'Other',
};

export default function EmployeeDocumentsPage() {
  const { user: me } = useAuth();
  const isHr = me?.role === Role.ADMIN || me?.role === Role.DIRECTOR || me?.role === Role.BRANCH_MANAGER;

  const [employees, setEmployees] = useState<EmployeeDTO[]>([]);
  const [viewingId, setViewingId] = useState<string>('');
  const [docs, setDocs] = useState<EmployeeDocumentDTO[]>([]);
  const [expiring, setExpiring] = useState<EmployeeDocumentDTO[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ type: EmployeeDocumentType.AADHAAR as EmployeeDocumentType, title: '', number: '', expiresOn: '', fileUrl: '' });

  useEffect(() => {
    if (!me) return;
    setViewingId(me.id);
    if (isHr) {
      api.get<EmployeeDTO[]>('/employees').then(setEmployees).catch(() => setEmployees([]));
      api.get<EmployeeDocumentDTO[]>('/employee-documents/expiring?days=60').then(setExpiring).catch(() => setExpiring([]));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me?.id]);

  async function loadDocs(userId: string) {
    try {
      setDocs(await api.get<EmployeeDocumentDTO[]>(`/employee-documents/user/${userId}`));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load documents');
    }
  }

  useEffect(() => {
    if (viewingId) loadDocs(viewingId);
  }, [viewingId]);

  async function handleFile(file: File) {
    setUploading(true);
    setError(null);
    try {
      const url = await uploadFile(file);
      setForm((f) => ({ ...f, fileUrl: url }));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    if (!form.fileUrl) {
      setError('Upload the document file first');
      return;
    }
    setError(null);
    try {
      await api.post('/employee-documents', {
        userId: viewingId,
        type: form.type,
        title: form.title,
        fileUrl: form.fileUrl,
        number: form.number || undefined,
        expiresOn: form.expiresOn || undefined,
      });
      setForm({ type: EmployeeDocumentType.AADHAAR, title: '', number: '', expiresOn: '', fileUrl: '' });
      setShowForm(false);
      await loadDocs(viewingId);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to save document');
    }
  }

  async function remove(id: string) {
    if (!confirm('Delete this document?')) return;
    try {
      await api.delete(`/employee-documents/${id}`);
      await loadDocs(viewingId);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to delete');
    }
  }

  return (
    <AppShell>
      <h1 className="text-2xl font-extrabold tracking-tight text-brand-700">Employee Documents</h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        ID proofs, contracts and certificates — the same expiry tracking already used for traveler passports.
      </p>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      {isHr && expiring.length > 0 && (
        <section className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/30">
          <h2 className="text-sm font-semibold text-amber-800 dark:text-amber-300">Expiring within 60 days</h2>
          <ul className="mt-2 space-y-1 text-sm text-amber-900 dark:text-amber-200">
            {expiring.map((d) => (
              <li key={d.id}>
                {d.user?.name} — {TYPE_LABELS[d.type]} ({d.title}) expires {d.expiresOn && new Date(d.expiresOn).toLocaleDateString('en-IN')}
              </li>
            ))}
          </ul>
        </section>
      )}

      {isHr && (
        <label className="mt-4 block text-xs text-slate-500">
          Viewing documents for
          <select value={viewingId} onChange={(e) => setViewingId(e.target.value)} className="mt-1 block w-full max-w-xs rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900">
            <option value={me?.id}>Myself</option>
            {employees.filter((e) => e.id !== me?.id).map((e) => (
              <option key={e.id} value={e.id}>{e.name}</option>
            ))}
          </select>
        </label>
      )}

      <div className="mt-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-brand-700">Documents</h2>
        <button onClick={() => setShowForm((v) => !v)} className="rounded-lg border border-brand-200 px-3 py-1.5 text-xs font-medium text-brand hover:bg-brand-50">
          {showForm ? 'Cancel' : '+ Add Document'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleAdd} className="mt-3 grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-2 dark:border-slate-700 dark:bg-slate-800">
          <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as EmployeeDocumentType })} className="rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900">
            {Object.values(EmployeeDocumentType).map((t) => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
          </select>
          <input required placeholder="Title (e.g. Aadhaar Card)" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900" />
          <input placeholder="Number (optional)" value={form.number} onChange={(e) => setForm({ ...form, number: e.target.value })} className="rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900" />
          <label className="text-xs text-slate-500">
            Expires on (optional)
            <input type="date" value={form.expiresOn} onChange={(e) => setForm({ ...form, expiresOn: e.target.value })} className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900" />
          </label>
          <div className="sm:col-span-2">
            <input type="file" disabled={uploading} onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} className="text-xs" />
            {form.fileUrl && <span className="ml-2 text-xs text-emerald-600">File uploaded ✓</span>}
          </div>
          <button type="submit" className="rounded-xl bg-gradient-to-br from-brand-600 to-brand-500 px-4 py-2 text-sm font-medium text-white shadow-md shadow-brand-500/25 hover:opacity-90 sm:col-span-2">
            Save Document
          </button>
        </form>
      )}

      <div className="mt-3 overflow-x-auto rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
        <table className="w-full text-sm">
          <thead className="bg-brand-50/60 text-left text-xs font-semibold uppercase tracking-wide text-brand-700 dark:bg-slate-900/40 dark:text-brand-300">
            <tr>
              <th className="px-4 py-2">Type</th>
              <th className="px-4 py-2">Title</th>
              <th className="px-4 py-2">Number</th>
              <th className="px-4 py-2">Expires</th>
              <th className="px-4 py-2"></th>
              <th className="px-4 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {docs.map((d) => (
              <tr key={d.id} className="border-t border-slate-100 dark:border-slate-700">
                <td className="px-4 py-2 text-slate-600 dark:text-slate-300">{TYPE_LABELS[d.type]}</td>
                <td className="px-4 py-2 text-slate-800 dark:text-slate-100">{d.title}</td>
                <td className="px-4 py-2 text-slate-500">{d.number ?? '—'}</td>
                <td className="px-4 py-2 text-slate-500">{d.expiresOn ? new Date(d.expiresOn).toLocaleDateString('en-IN') : '—'}</td>
                <td className="px-4 py-2">
                  <a href={d.fileUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-brand hover:underline">View file</a>
                </td>
                <td className="px-4 py-2 text-right">
                  <button onClick={() => remove(d.id)} className="text-xs text-red-500 hover:underline">Delete</button>
                </td>
              </tr>
            ))}
            {docs.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-6 text-center text-slate-400">No documents on file.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}
