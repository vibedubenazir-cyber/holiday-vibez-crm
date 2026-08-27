'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { AppShell } from '@/components/AppShell';
import { useAuth } from '@/lib/auth-context';
import { api, ApiError } from '@/lib/api';
import { Role, type CourseDetailDTO, type SelfAssessmentResultDTO } from '@holiday-vibez/shared';

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

  // Manager authoring drafts (one open at a time)
  const [showChapterForm, setShowChapterForm] = useState(false);
  const [chapterDraft, setChapterDraft] = useState('');
  const [lessonChapterId, setLessonChapterId] = useState<string | null>(null);
  const [lessonDraft, setLessonDraft] = useState({ title: '', content: '' });
  const [saChapterId, setSaChapterId] = useState<string | null>(null);
  const [saDraft, setSaDraft] = useState({ text: '', options: ['', ''], correctIndex: 0, explanation: '' });
  const [showQuestionForm, setShowQuestionForm] = useState(false);
  const [questionForm, setQuestionForm] = useState({ text: '', options: ['', ''], correctIndex: 0 });

  // Learner self-assessment state (per chapter)
  const [saAnswers, setSaAnswers] = useState<Record<string, Record<string, number>>>({});
  const [saResults, setSaResults] = useState<Record<string, SelfAssessmentResultDTO>>({});
  const [saBusy, setSaBusy] = useState<string | null>(null);

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

  async function handleAddChapter(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api.post(`/lms/courses/${courseId}/chapters`, { title: chapterDraft });
      setChapterDraft('');
      setShowChapterForm(false);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to add chapter');
    }
  }

  async function handleDeleteChapter(chapterId: string) {
    setError(null);
    try {
      await api.delete(`/lms/chapters/${chapterId}`);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to delete chapter');
    }
  }

  async function handleAddLesson(e: FormEvent, chapterId: string) {
    e.preventDefault();
    setError(null);
    try {
      await api.post(`/lms/courses/${courseId}/lessons`, { ...lessonDraft, chapterId });
      setLessonDraft({ title: '', content: '' });
      setLessonChapterId(null);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to add lesson');
    }
  }

  async function handleAddSaQuestion(e: FormEvent, chapterId: string) {
    e.preventDefault();
    setError(null);
    try {
      await api.post(`/lms/chapters/${chapterId}/self-assessment`, {
        text: saDraft.text,
        options: saDraft.options.filter((o) => o.trim() !== ''),
        correctIndex: saDraft.correctIndex,
        explanation: saDraft.explanation.trim() || undefined,
      });
      setSaDraft({ text: '', options: ['', ''], correctIndex: 0, explanation: '' });
      setSaChapterId(null);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to add self-assessment question');
    }
  }

  async function handleDeleteSaQuestion(questionId: string) {
    setError(null);
    try {
      await api.delete(`/lms/self-assessment/${questionId}`);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to delete question');
    }
  }

  async function handleCheckSelfAssessment(chapterId: string, questionIds: string[]) {
    setSaBusy(chapterId);
    setError(null);
    try {
      const answers = questionIds.map((qid) => ({ questionId: qid, selectedIndex: saAnswers[chapterId]?.[qid] ?? -1 }));
      const result = await api.post<SelfAssessmentResultDTO>(`/lms/courses/${courseId}/chapters/${chapterId}/self-assessment/check`, { answers });
      setSaResults((r) => ({ ...r, [chapterId]: result }));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to check answers');
    } finally {
      setSaBusy(null);
    }
  }

  function resetSelfAssessment(chapterId: string) {
    setSaResults((r) => {
      const next = { ...r };
      delete next[chapterId];
      return next;
    });
    setSaAnswers((a) => ({ ...a, [chapterId]: {} }));
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
      <h1 className="text-2xl font-extrabold tracking-tight text-brand-700">{course.title}</h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{course.description}</p>
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      {!course.enrolled ? (
        <button onClick={handleEnroll} disabled={enrolling} className="mt-4 rounded-xl bg-gradient-to-br from-brand-600 to-brand-500 shadow-md shadow-brand-500/25 px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60">
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
          {course.dueDate && (
            <p className={`mt-1 text-xs font-medium ${new Date(course.dueDate) < new Date() ? 'text-red-600' : 'text-slate-500 dark:text-slate-400'}`}>
              {new Date(course.dueDate) < new Date() ? 'Overdue — ' : 'Due '}{new Date(course.dueDate).toLocaleDateString()}
            </p>
          )}
        </div>
      )}

      {/* ---- Course content: chapters ---- */}
      <div className="mt-4 flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Course content</p>
        {isManager && (
          <button onClick={() => setShowChapterForm((s) => !s)} className="text-sm text-brand hover:underline">
            {showChapterForm ? 'Cancel' : 'Add chapter'}
          </button>
        )}
      </div>

      {isManager && showChapterForm && (
        <form onSubmit={handleAddChapter} className="mt-2 flex flex-wrap items-end gap-2 rounded-lg border border-slate-100 bg-slate-50/60 p-3 dark:border-slate-700 dark:bg-slate-900/30">
          <input required placeholder="Chapter title" value={chapterDraft} onChange={(e) => setChapterDraft(e.target.value)} className="w-64 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-100" />
          <button type="submit" className="rounded-xl bg-gradient-to-br from-brand-600 to-brand-500 px-3 py-2 text-sm font-medium text-white shadow-md shadow-brand-500/25 hover:opacity-90">Add chapter</button>
        </form>
      )}

      {course.chapters.length === 0 && <p className="mt-3 text-sm text-slate-400">No chapters yet.</p>}

      <div className="mt-3 space-y-4">
        {course.chapters.map((ch, ci) => {
          const result = saResults[ch.id];
          return (
            <div key={ch.id} className="rounded-xl bg-white p-4 shadow-card dark:bg-slate-800">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Chapter {ci + 1}: {ch.title}</p>
                {isManager && (
                  <div className="flex items-center gap-3 text-xs">
                    <button onClick={() => { setLessonChapterId(lessonChapterId === ch.id ? null : ch.id); setLessonDraft({ title: '', content: '' }); }} className="text-brand hover:underline">
                      {lessonChapterId === ch.id ? 'Cancel' : '+ Lesson'}
                    </button>
                    <button onClick={() => { setSaChapterId(saChapterId === ch.id ? null : ch.id); setSaDraft({ text: '', options: ['', ''], correctIndex: 0, explanation: '' }); }} className="text-brand hover:underline">
                      {saChapterId === ch.id ? 'Cancel' : '+ Self-check'}
                    </button>
                    <button onClick={() => handleDeleteChapter(ch.id)} className="text-red-500 hover:underline">Delete</button>
                  </div>
                )}
              </div>

              {/* lessons */}
              <ul className="mt-2 divide-y divide-slate-100 dark:divide-slate-700">
                {ch.lessons.map((l, idx) => {
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
                {ch.lessons.length === 0 && <li className="py-2 text-sm text-slate-400">No lessons in this chapter yet.</li>}
              </ul>

              {isManager && lessonChapterId === ch.id && (
                <form onSubmit={(e) => handleAddLesson(e, ch.id)} className="mt-2 flex flex-wrap items-end gap-2 rounded-lg border border-slate-100 bg-slate-50/60 p-3 dark:border-slate-700 dark:bg-slate-900/30">
                  <input required placeholder="Lesson title" value={lessonDraft.title} onChange={(e) => setLessonDraft({ ...lessonDraft, title: e.target.value })} className="w-52 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-100" />
                  <input required placeholder="Content / video URL / notes" value={lessonDraft.content} onChange={(e) => setLessonDraft({ ...lessonDraft, content: e.target.value })} className="min-w-[200px] flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-100" />
                  <button type="submit" className="rounded-xl bg-gradient-to-br from-brand-600 to-brand-500 px-3 py-2 text-sm font-medium text-white shadow-md shadow-brand-500/25 hover:opacity-90">Add</button>
                </form>
              )}

              {/* self-assessment (ungraded practice) */}
              {(ch.selfAssessment.length > 0 || (isManager && saChapterId === ch.id)) && (
                <div className="mt-3 rounded-lg border border-amber-100 bg-amber-50/50 p-3 dark:border-amber-900/40 dark:bg-amber-900/10">
                  <p className="text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-400">Self-check · practice (not graded)</p>

                  {/* manager view: list with answer key + delete */}
                  {isManager ? (
                    <ul className="mt-2 space-y-1.5">
                      {ch.selfAssessment.map((q, qi) => (
                        <li key={q.id} className="flex items-start justify-between gap-2 text-sm">
                          <span className="text-slate-700 dark:text-slate-200">
                            {qi + 1}. {q.text} <span className="text-emerald-600">→ {q.options[q.correctIndex ?? 0]}</span>
                            {q.explanation && <span className="block text-xs text-slate-500 dark:text-slate-400">{q.explanation}</span>}
                          </span>
                          <button onClick={() => handleDeleteSaQuestion(q.id)} className="shrink-0 text-xs text-red-500 hover:underline">Remove</button>
                        </li>
                      ))}
                      {ch.selfAssessment.length === 0 && <li className="text-sm text-slate-400">No self-check questions yet.</li>}
                    </ul>
                  ) : !course.enrolled ? (
                    <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Enroll to try this chapter’s self-check.</p>
                  ) : result ? (
                    <div className="mt-2 space-y-2">
                      <p className="text-sm font-medium text-slate-700 dark:text-slate-200">You got {result.correct} / {result.total} right.</p>
                      {ch.selfAssessment.map((q, qi) => {
                        const r = result.results.find((x) => x.questionId === q.id);
                        const picked = saAnswers[ch.id]?.[q.id];
                        return (
                          <div key={q.id} className="text-sm">
                            <p className="font-medium text-slate-800 dark:text-slate-100">
                              {qi + 1}. {q.text} {r?.correct ? <span className="text-emerald-600">✓ correct</span> : <span className="text-red-600">✗ your answer: {picked != null && picked >= 0 ? q.options[picked] : '—'}</span>}
                            </p>
                            {!r?.correct && r && <p className="text-slate-600 dark:text-slate-300">Correct answer: {q.options[r.correctIndex]}</p>}
                            {r?.explanation && <p className="text-xs text-slate-500 dark:text-slate-400">{r.explanation}</p>}
                          </div>
                        );
                      })}
                      <button onClick={() => resetSelfAssessment(ch.id)} className="mt-1 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-200">Try again</button>
                    </div>
                  ) : (
                    <div className="mt-2 space-y-3">
                      {ch.selfAssessment.map((q, qi) => (
                        <div key={q.id}>
                          <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{qi + 1}. {q.text}</p>
                          <div className="mt-1 flex flex-col gap-1">
                            {q.options.map((opt, oi) => (
                              <label key={oi} className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                                <input type="radio" name={`sa-${q.id}`} checked={saAnswers[ch.id]?.[q.id] === oi} onChange={() => setSaAnswers((a) => ({ ...a, [ch.id]: { ...a[ch.id], [q.id]: oi } }))} />
                                {opt}
                              </label>
                            ))}
                          </div>
                        </div>
                      ))}
                      <button
                        onClick={() => handleCheckSelfAssessment(ch.id, ch.selfAssessment.map((q) => q.id))}
                        disabled={saBusy === ch.id}
                        className="rounded-lg bg-amber-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-600 disabled:opacity-60"
                      >
                        {saBusy === ch.id ? 'Checking...' : 'Check answers'}
                      </button>
                    </div>
                  )}

                  {isManager && saChapterId === ch.id && (
                    <form onSubmit={(e) => handleAddSaQuestion(e, ch.id)} className="mt-3 flex flex-col gap-2 rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-800">
                      <input required placeholder="Question" value={saDraft.text} onChange={(e) => setSaDraft({ ...saDraft, text: e.target.value })} className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-100" />
                      {saDraft.options.map((opt, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <input type="radio" name={`sa-correct-${ch.id}`} checked={saDraft.correctIndex === i} onChange={() => setSaDraft({ ...saDraft, correctIndex: i })} />
                          <input required placeholder={`Option ${i + 1}`} value={opt} onChange={(e) => { const options = [...saDraft.options]; options[i] = e.target.value; setSaDraft({ ...saDraft, options }); }} className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-100" />
                        </div>
                      ))}
                      <input placeholder="Explanation (optional, shown after answering)" value={saDraft.explanation} onChange={(e) => setSaDraft({ ...saDraft, explanation: e.target.value })} className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-100" />
                      <div className="flex items-center gap-2">
                        <button type="button" onClick={() => setSaDraft({ ...saDraft, options: [...saDraft.options, ''] })} className="text-sm text-brand hover:underline">+ Add option</button>
                        <button type="submit" className="ml-auto rounded-xl bg-gradient-to-br from-brand-600 to-brand-500 px-3 py-2 text-sm font-medium text-white shadow-md shadow-brand-500/25 hover:opacity-90">Add question</button>
                      </div>
                    </form>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ---- Final graded quiz ---- */}
      <div className="mt-4 rounded-lg bg-white p-4 shadow-card dark:bg-slate-800">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Final quiz (graded)</p>
          {isManager && (
            <button onClick={() => setShowQuestionForm((s) => !s)} className="text-sm text-brand hover:underline">
              {showQuestionForm ? 'Cancel' : 'Add question'}
            </button>
          )}
        </div>

        {isManager && showQuestionForm && (
          <form onSubmit={handleAddQuestion} className="mt-2 flex flex-col gap-2 rounded-lg border border-slate-100 bg-slate-50/60 p-3 dark:border-slate-700 dark:bg-slate-900/30">
            <input required placeholder="Question" value={questionForm.text} onChange={(e) => setQuestionForm({ ...questionForm, text: e.target.value })} className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-100" />
            {questionForm.options.map((opt, i) => (
              <div key={i} className="flex items-center gap-2">
                <input type="radio" name="correct" checked={questionForm.correctIndex === i} onChange={() => setQuestionForm({ ...questionForm, correctIndex: i })} />
                <input required placeholder={`Option ${i + 1}`} value={opt} onChange={(e) => { const options = [...questionForm.options]; options[i] = e.target.value; setQuestionForm({ ...questionForm, options }); }} className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-100" />
              </div>
            ))}
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setQuestionForm({ ...questionForm, options: [...questionForm.options, ''] })} className="text-sm text-brand hover:underline">+ Add option</button>
              <button type="submit" className="ml-auto rounded-xl bg-gradient-to-br from-brand-600 to-brand-500 px-3 py-2 text-sm font-medium text-white shadow-md shadow-brand-500/25 hover:opacity-90">Add question</button>
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
            <button type="submit" disabled={submittingQuiz} className="self-start rounded-xl bg-gradient-to-br from-brand-600 to-brand-500 shadow-md shadow-brand-500/25 px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60">
              {submittingQuiz ? 'Submitting...' : 'Submit quiz'}
            </button>
          </form>
        ) : course.enrolled && !allLessonsDone && course.quizQuestions.length > 0 ? (
          <p className="mt-2 text-sm text-slate-400">Complete all lessons to unlock the quiz.</p>
        ) : (
          <p className="mt-2 text-sm text-slate-400">{course.quizQuestions.length} question{course.quizQuestions.length === 1 ? '' : 's'} in this course&apos;s quiz.</p>
        )}
      </div>
    </AppShell>
  );
}
