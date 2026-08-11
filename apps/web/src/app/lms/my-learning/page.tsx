'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/AppShell';
import { api, ApiError } from '@/lib/api';
import type { MyLearningRowDTO, CertificateDTO } from '@holiday-vibez/shared';

export default function MyLearningPage() {
  const [rows, setRows] = useState<MyLearningRowDTO[]>([]);
  const [certificates, setCertificates] = useState<CertificateDTO[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      const [learning, certs] = await Promise.all([
        api.get<MyLearningRowDTO[]>('/lms/me/learning'),
        api.get<CertificateDTO[]>('/lms/me/certificates'),
      ]);
      setRows(learning);
      setCertificates(certs);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load your learning progress');
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <AppShell>
      <h1 className="inline-block rounded-lg bg-brand-50 px-4 py-2 text-xl font-bold tracking-tight text-brand shadow-card">My Learning & Certificates</h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Your enrolled courses, progress, and earned certificates.</p>
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      <div className="mt-4 overflow-hidden bg-white dark:bg-slate-800">
        <table className="w-full text-sm">
          <thead className="bg-brand-50/60 text-left text-xs font-semibold uppercase tracking-wide text-brand-700 dark:bg-slate-900/40">
            <tr>
              <th className="px-4 py-2">Course</th>
              <th className="px-4 py-2">Progress</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const pct = r.totalLessons === 0 ? 0 : Math.round((r.completedLessons / r.totalLessons) * 100);
              return (
                <tr key={r.enrollmentId} className="border-t border-slate-100 dark:border-slate-700">
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      {r.imageUrl && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={r.imageUrl} alt="" className="h-8 w-8 shrink-0 rounded-lg object-cover" />
                      )}
                      <span className="font-medium text-slate-800 dark:text-slate-100">{r.title}</span>
                    </div>
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-32 overflow-hidden rounded-lg bg-slate-100 dark:bg-slate-700">
                        <div className="h-full bg-brand" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-xs text-slate-500 dark:text-slate-400">{r.completedLessons}/{r.totalLessons}</span>
                    </div>
                  </td>
                  <td className="px-4 py-2.5">
                    {r.completedAt ? (
                      <span className="rounded-lg bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">Completed</span>
                    ) : (
                      <span className="rounded-lg bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">In progress</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <Link href={`/lms/${r.courseId}`} className="text-brand hover:underline">Continue</Link>
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr><td colSpan={4} className="px-4 py-6 text-center text-slate-400">Not enrolled in any courses yet — browse <Link href="/lms" className="text-brand hover:underline">Courses</Link>.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="mt-6 text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Certificates</p>
      <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {certificates.map((c) => (
          <div key={c.id} className="rounded-lg bg-white p-4 shadow-card dark:bg-slate-800">
            <p className="text-2xl">🎓</p>
            <p className="mt-1 font-medium text-slate-800 dark:text-slate-100">{c.courseTitle}</p>
            <p className="text-sm text-slate-500 dark:text-slate-400">{c.certNo}</p>
            <p className="text-xs text-slate-400">Issued {new Date(c.issuedAt).toLocaleDateString()}</p>
          </div>
        ))}
        {certificates.length === 0 && <p className="text-sm text-slate-400">No certificates earned yet.</p>}
      </div>
    </AppShell>
  );
}
