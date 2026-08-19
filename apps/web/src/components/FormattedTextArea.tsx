'use client';

import { useRef } from 'react';

/**
 * A single textarea with a tiny markdown-lite toolbar (bold + bullet), rather
 * than one text input per line — replaces the earlier "+ Add point" row
 * pattern, which made pasting or reflowing a paragraph impossible. Formatting
 * is plain text (**bold**, "• " line prefixes) so it round-trips through the
 * existing single-string description/terms columns with no schema change;
 * ItineraryReport.tsx's DescriptionBlock/TermsBlock parse it back out at
 * render time (web + PDF).
 */
export function FormattedTextArea({
  value,
  onChange,
  placeholder,
  rows = 4,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
  className?: string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  function toggleBold() {
    const el = ref.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selected = value.slice(start, end) || 'bold text';
    const next = `${value.slice(0, start)}**${selected}**${value.slice(end)}`;
    onChange(next);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + 2, start + 2 + selected.length);
    });
  }

  function insertBullet() {
    const el = ref.current;
    if (!el) return;
    const start = el.selectionStart;
    const lineStart = value.lastIndexOf('\n', start - 1) + 1;
    if (/^[•\-*]\s/.test(value.slice(lineStart))) {
      el.focus();
      return;
    }
    const next = `${value.slice(0, lineStart)}• ${value.slice(lineStart)}`;
    onChange(next);
    const cursor = start + 2;
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(cursor, cursor);
    });
  }

  return (
    <div>
      <div className="mb-1 flex items-center gap-1">
        <button
          type="button"
          onClick={toggleBold}
          title="Bold selected text"
          className="rounded border border-slate-300 px-2 py-0.5 text-xs font-bold text-slate-600 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
        >
          B
        </button>
        <button
          type="button"
          onClick={insertBullet}
          title="Start a bullet point on this line"
          className="rounded border border-slate-300 px-2 py-0.5 text-xs text-slate-600 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
        >
          • List
        </button>
      </div>
      <textarea
        ref={ref}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className={
          className ??
          'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900'
        }
      />
    </div>
  );
}
