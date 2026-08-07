'use client';

import { useEffect, useRef, useState } from 'react';

export interface BadgeDropdownOption {
  value: string;
  label: string;
  colorClass: string; // e.g. 'bg-red-100 text-red-700'
  dotClass?: string; // e.g. 'bg-red-500' — small dot shown in the menu row
}

/**
 * A colored-pill trigger that opens a small custom menu — replaces the native
 * <select> (which renders as an unstyled OS dropdown, out of step with the
 * rest of the app's design) for status/priority-style fields.
 */
export function BadgeDropdown({
  value,
  options,
  onChange,
  disabled = false,
  triggerClassName = '',
}: {
  value: string;
  options: BadgeDropdownOption[];
  onChange: (value: string) => void;
  disabled?: boolean;
  /** Fixes the trigger's width (e.g. "w-[130px]") so every badge in a column
   * renders the same size regardless of how long its label is — pass this
   * per-column so "JUNK NOT INTERESTED" and "NEW" don't produce mismatched
   * pill sizes or wrap onto two lines. */
  triggerClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const current = options.find((o) => o.value === value);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  return (
    <div ref={rootRef} className="relative inline-block">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className={`inline-flex items-center justify-center gap-1 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium transition-opacity hover:opacity-80 disabled:cursor-default disabled:opacity-100 ${
          current?.colorClass ?? 'bg-slate-100 text-slate-600'
        } ${triggerClassName}`}
      >
        <span className="truncate">{current?.label ?? value}</span>
        {!disabled && (
          <svg viewBox="0 0 20 20" fill="currentColor" className="h-3 w-3 shrink-0 opacity-60">
            <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.25a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z" clipRule="evenodd" />
          </svg>
        )}
      </button>

      {open && !disabled && (
        <div className="absolute left-0 top-full z-20 mt-1 w-48 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-600 dark:bg-slate-800">
          {options.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => {
                onChange(o.value);
                setOpen(false);
              }}
              className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-700 ${
                o.value === value ? 'font-semibold text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-300'
              }`}
            >
              <span className={`h-2 w-2 shrink-0 rounded-full ${o.dotClass ?? 'bg-slate-400'}`} />
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
