'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/AppShell';
import { useAuth } from '@/lib/auth-context';
import { api, ApiError } from '@/lib/api';
import { Role, type CourseDTO } from '@holiday-vibez/shared';

export default function LmsCoursesPage() {
  const { user: me } = useAuth();
  const [courses, setCourses] = useState<CourseDTO[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const isManager = me?.role === Role.ADMIN || me?.role === Role.DIRECTOR;

  const [form, setForm] = useState({ title: '', description: '', category: '' });

  async function load() {
    try {
      setCourses(await api.get<CourseDTO[]>(`/lms/courses${isManager ? '?all=1' : ''}`));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load courses');
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api.post('/lms/courses', { title: form.title, description: form.description, category: form.category || undefined });
      setForm({ title: '', description: '', category: '' });
      setShowForm(false);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to create course');
    }
  }

  return (
    <AppShell>
      <div className="flex items-center justify-between">
        <h1 className="inline-block rounded-lg bg-brand-50 px-4 py-2 text-xl font-bold tracking-tight text-brand shadow-card">Courses</h1>
        {isManager && (
          <button onClick={() => setShowForm((s) => !s)} className="rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-brand-700">
            {showForm ? 'Cancel' : 'Add course'}
          </button>
        )}
      </div>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Staff training courses — enroll, work through lessons, and take the quiz to earn a certificate.</p>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      {isManager && showForm && (
        <form onSubmit={handleCreate} className="mt-4 flex flex-wrap items-end gap-2 rounded-xl border border-slate-200 bg-white dark:bg-slate-800 shadow-card transition-shadow hover:shadow-card-hover p-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-500">Title</label>
            <input required placeholder="Onboarding Basics" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="w-56 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-100 transition-colors" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-500">Category</label>
            <input placeholder="Optional" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="w-40 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-100 transition-colors" />
          </div>
          <div className="flex flex-1 flex-col gap-1">
            <label className="text-xs font-medium text-slate-500">Description</label>
            <input required placeholder="What staff will learn" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-100 transition-colors" />
          </div>
          <button type="submit" className="rounded-lg bg-brand px-3 py-2 text-sm font-medium text-white hover:bg-brand-dark">Create</button>
        </form>
      )}

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {courses.map((c) => (
          <Link
            key={c.id}
            href={`/lms/${c.id}`}
            className="flex flex-col gap-2 rounded-lg bg-white p-4 shadow-card transition-all hover:-translate-y-0.5 hover:shadow-card-hover dark:bg-slate-800"
          >
            <div className="flex items-center justify-between">
              <span className="font-medium text-slate-800 dark:text-slate-100">{c.title}</span>
              {!c.active && <span className="rounded-lg bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-600">Inactive</span>}
            </div>
            <p className="line-clamp-2 text-sm text-slate-500 dark:text-slate-400">{c.description}</p>
            <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-slate-400">
              {c.category && <span className="rounded-lg bg-white dark:bg-slate-800 px-2 py-0.5 font-medium text-brand-700">{c.category}</span>}
              <span>{c.lessonCount} lesson{c.lessonCount === 1 ? '' : 's'}</span>
              {c.hasQuiz && <span>· Quiz</span>}
              <span>· {c.enrollmentCount} enrolled</span>
            </div>
          </Link>
        ))}
        {courses.length === 0 && <p className="text-sm text-slate-400">No courses yet.</p>}
      </div>
    </AppShell>
  );
}
