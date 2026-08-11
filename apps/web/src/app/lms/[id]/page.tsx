'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { AppShell } from '@/components/AppShell';
import { useAuth } from '@/lib/auth-context';
import { api, ApiError } from '@/lib/api';
import { Role, type CourseDetailDTO } from '@holiday-vibez/shared';

export default function CourseDetailPage() {
  const params = useParams<{ id: string }>();
  const courseId = params.id;
  const { user: me } = useAuth();
  const [course, setCourse] = useState<CourseDetailDTO | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyLessonId, setBusyLessonId] = useState<string | null>(null);
  const [enrolling, setEnrolling] = useState(false);
  const [quizAnswers, setQuizAnswers] = useState<Record<string, number>>({});
  const [submittingQuiz, setSubmittingQuiz] = useState(false);
  const isManager = me?.role === Role.ADMIN || me?.role === Role.DIRECTOR;

  const [lessonForm, setLessonForm] = useState({ title: '', content: '' });
  const [showLessonForm, setShowLessonForm] = useState(false);
  const [questionForm, setQuestionForm] = useState({ text: '', options: ['', ''], correctIndex: 0 });
  const [showQuestionForm, setShowQuestionForm] = useState(false);

  async function load() {
    try {
      setCourse(await api.get<CourseDetailDTO>(`/lms/courses/${courseId}`));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load course');
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId]);

  async function handleEnroll() {
    setEnrolling(true);
    setError(null);
    try {
      await api.post(`/lms/courses/${courseId}/enroll`);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to enroll');
    } finally {
      setEnrolling(false);
    }
  }

  async function handleMarkComplete(lessonId: string) {
    setBusyLessonId(lessonId);
    setError(null);
    try {
      await api.post(`/lms/courses/${courseId}/lessons/${lessonId}/complete`);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to mark lesson complete');
    } finally {
      setBusyLessonId(null);
    }
  }

  async function handleSubmitQuiz(e: FormEvent) {
    e.preventDefault();
    if (!course) return;
    setSubmittingQuiz(true);
    setError(null);
    try {
      const answers = course.quizQuestions.map((q) => ({ questionId: q.id, selectedIndex: quizAnswers[q.id] ?? -1 }));
      await api.post(`/lms/courses/${courseId}/quiz/submit`, { answers });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to submit quiz');
    } finally {
      setSubmittingQuiz(false);
    }
  }

  async function handleAddLesson(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api.post(`/lms/courses/${courseId}/lessons`, lessonForm);
      setLessonForm({ title: '', content: '' });
      setShowLessonForm(false);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to add lesson');
    }
  }

  async function handleAddQuestion(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api.post(`/lms/courses/${courseId}/quiz-questions`, {
        text: questionForm.text,
        options: questionForm.options.filter((o) => o.trim() !== ''),
        correctIndex: questionForm.correctIndex,
      });
      setQuestionForm({ text: '', options: ['', ''], correctIndex: 0 });
      setShowQuestionForm(false);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to add question');
    }
  }

  if (!course) {
    return (
      <AppShell>
        {error ? <p className="text-sm text-red-600">{error}</p> : <p className="text-sm text-slate-500 dark:text-slate-400">Loading course...</p>}
      </AppShell>
    );
  }

  const allLessonsDone = course.lessons.length > 0 && course.lessons.every((l) => course.completedLessonIds.includes(l.id));
  const canTakeQuiz = course.enrolled && allLessonsDone && course.quizQuestions.length > 0 && !course.certificate;

  return (
    <AppShell>
      {course.imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={course.imageUrl} alt={course.title} className="mb-4 h-48 w-full rounded-xl object-cover shadow-card" />
      )}
      <h1 className="inline-block rounded-lg bg-brand-50 px-4 py-2 text-xl font-bold tracking-tight text-brand shadow-card">{course.title}</h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{course.description}</p>
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      {!course.enrolled ? (
        <button onClick={handleEnroll} disabled={enrolling} className="mt-4 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark disabled:opacity-60">
          {enrolling ? 'Enrolling...' : 'Enroll in this course'}
        </button>
      ) : course.certificate ? (
        <div className="mt-4 rounded-lg bg-white p-4 shadow-card dark:bg-slate-800">
          <p className="text-sm font-medium text-blue-700">🎓 Completed — certificate {course.certificate.certNo} issued</p>
        </div>
      ) : (
        <div className="mt-4 rounded-lg bg-white p-3 shadow-card dark:bg-slate-800">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Progress: {course.completedLessonIds.length} / {course.lessons.length} lessons complete
            {course.latestAttempt && !course.latestAttempt.passed && ` · last quiz attempt: ${course.latestAttempt.score}% (not passed, try again)`}
          </p>
        </div>
      )}

      <div className="mt-4 rounded-lg bg-white p-4 shadow-card dark:bg-slate-800">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Lessons</p>
          {isManager && (
            <button onClick={() => setShowLessonForm((s) => !s)} className="text-sm text-brand hover:underline">
              {showLessonForm ? 'Cancel' : 'Add lesson'}
            </button>
          )}
        </div>

        {isManager && showLessonForm && (
          <form onSubmit={handleAddLesson} className="mt-2 flex flex-wrap items-end gap-2 rounded-lg border border-slate-100 bg-slate-50/60 p-3 dark:border-slate-700 dark:bg-slate-900/30">
            <input required placeholder="Lesson title" value={lessonForm.title} onChange={(e) => setLessonForm({ ...lessonForm, title: e.target.value })} className="w-56 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-100 transition-colors" />
            <input required placeholder="Content / video URL / notes" value={lessonForm.content} onChange={(e) => setLessonForm({ ...lessonForm, content: e.target.value })} className="flex-1 min-w-[200px] rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-100 transition-colors" />
            <button type="submit" className="rounded-lg bg-brand px-3 py-2 text-sm font-medium text-white hover:bg-brand-dark">Add</button>
          </form>
        )}

        <ul className="mt-3 divide-y divide-slate-100 dark:divide-slate-700">
          {course.lessons.map((l, idx) => {
            const done = course.completedLessonIds.includes(l.id);
            return (
              <li key={l.id} className="flex items-center justify-between gap-3 py-2.5">
                <div>
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{idx + 1}. {l.title}</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{l.content}</p>
                </div>
                {course.enrolled && !course.certificate && (
                  <button
                    onClick={() => handleMarkComplete(l.id)}
                    disabled={done || busyLessonId === l.id}
                    className={`shrink-0 rounded-lg px-2 py-0.5 text-xs font-medium ${done ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                  >
                    {done ? 'Done' : busyLessonId === l.id ? 'Saving...' : 'Mark complete'}
                  </button>
                )}
              </li>
            );
          })}
          {course.lessons.length === 0 && <li className="py-2 text-sm text-slate-400">No lessons added yet.</li>}
        </ul>
      </div>

      <div className="mt-4 rounded-lg bg-white p-4 shadow-card dark:bg-slate-800">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Quiz</p>
          {isManager && (
            <button onClick={() => setShowQuestionForm((s) => !s)} className="text-sm text-brand hover:underline">
              {showQuestionForm ? 'Cancel' : 'Add question'}
            </button>
          )}
        </div>

        {isManager && showQuestionForm && (
          <form onSubmit={handleAddQuestion} className="mt-2 flex flex-col gap-2 rounded-lg border border-slate-100 bg-slate-50/60 p-3 dark:border-slate-700 dark:bg-slate-900/30">
            <input required placeholder="Question" value={questionForm.text} onChange={(e) => setQuestionForm({ ...questionForm, text: e.target.value })} className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-100 transition-colors" />
            {questionForm.options.map((opt, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  type="radio"
                  name="correct"
                  checked={questionForm.correctIndex === i}
                  onChange={() => setQuestionForm({ ...questionForm, correctIndex: i })}
                />
                <input
                  required
                  placeholder={`Option ${i + 1}`}
                  value={opt}
                  onChange={(e) => {
                    const options = [...questionForm.options];
                    options[i] = e.target.value;
                    setQuestionForm({ ...questionForm, options });
                  }}
                  className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-100 transition-colors"
                />
              </div>
            ))}
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setQuestionForm({ ...questionForm, options: [...questionForm.options, ''] })} className="text-sm text-brand hover:underline">
                + Add option
              </button>
              <button type="submit" className="ml-auto rounded-lg bg-brand px-3 py-2 text-sm font-medium text-white hover:bg-brand-dark">Add question</button>
            </div>
          </form>
        )}

        {course.quizQuestions.length === 0 ? (
          <p className="mt-2 text-sm text-slate-400">No quiz for this course — completing all lessons finishes it.</p>
        ) : canTakeQuiz ? (
          <form onSubmit={handleSubmitQuiz} className="mt-2 flex flex-col gap-4">
            {course.quizQuestions.map((q, qi) => (
              <div key={q.id}>
                <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{qi + 1}. {q.text}</p>
                <div className="mt-1 flex flex-col gap-1">
                  {q.options.map((opt, oi) => (
                    <label key={oi} className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                      <input type="radio" name={q.id} checked={quizAnswers[q.id] === oi} onChange={() => setQuizAnswers({ ...quizAnswers, [q.id]: oi })} />
                      {opt}
                    </label>
                  ))}
                </div>
              </div>
            ))}
            <button type="submit" disabled={submittingQuiz} className="self-start rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark disabled:opacity-60">
              {submittingQuiz ? 'Submitting...' : 'Submit quiz'}
            </button>
          </form>
        ) : course.enrolled && !allLessonsDone && course.quizQuestions.length > 0 ? (
          <p className="mt-2 text-sm text-slate-400">Complete all lessons to unlock the quiz.</p>
        ) : (
          <p className="mt-2 text-sm text-slate-400">{course.quizQuestions.length} question{course.quizQuestions.length === 1 ? '' : 's'} in this course's quiz.</p>
        )}
      </div>
    </AppShell>
  );
}
