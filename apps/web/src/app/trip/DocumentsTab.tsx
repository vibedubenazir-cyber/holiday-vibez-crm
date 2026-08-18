'use client';

import { useEffect, useRef, useState } from 'react';
import {
  deleteDocument,
  fetchDocuments,
  openDocument,
  uploadDocument,
  type TripDocument,
  type TripDocumentType,
} from '@/lib/traveler';

/**
 * Passports, visas, tickets and vouchers.
 *
 * Unlike every other tab, this one does NOT work offline, and says so. The
 * files are streamed from an authenticated endpoint and deliberately never
 * cached — a passport scan sitting in a browser cache on a device that later
 * gets lost or handed to someone is a worse outcome than a traveller having to
 * find signal to open it. Everything else in the app stays available offline;
 * this is the one considered exception.
 */

const TYPES: { value: TripDocumentType; label: string }[] = [
  { value: 'PASSPORT', label: 'Passport' },
  { value: 'VISA', label: 'Visa' },
  { value: 'FLIGHT_TICKET', label: 'Flight ticket' },
  { value: 'HOTEL_VOUCHER', label: 'Hotel voucher' },
  { value: 'INSURANCE', label: 'Insurance' },
  { value: 'ID_PROOF', label: 'ID proof' },
  { value: 'OTHER', label: 'Other' },
];

const TYPE_LABELS = Object.fromEntries(TYPES.map((t) => [t.value, t.label]));

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function DocumentsTab() {
  const [documents, setDocuments] = useState<TripDocument[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [type, setType] = useState<TripDocumentType>('PASSPORT');
  const fileInput = useRef<HTMLInputElement>(null);

  async function load() {
    try {
      setDocuments(await fetchDocuments());
      setError(null);
    } catch {
      setError('Your documents need a connection — reconnect to see them.');
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      await uploadDocument(file, type, file.name);
      await load();
    } catch {
      setError('That file could not be uploaded. Images and PDFs up to 10 MB.');
    } finally {
      setBusy(false);
      if (fileInput.current) fileInput.current.value = '';
    }
  }

  const mine = documents?.filter((d) => !d.sharedWithBooking) ?? [];
  const shared = documents?.filter((d) => d.sharedWithBooking) ?? [];

  return (
    <div className="space-y-4 p-4">
      <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200/70">
        <p className="font-bold text-slate-800">Add a document</p>
        <p className="mt-0.5 text-xs text-slate-500">
          Keep your passport and tickets here so they&apos;re with you even if the paper isn&apos;t.
        </p>

        <div className="mt-3 flex gap-2">
          <select
            value={type}
            onChange={(e) => setType(e.target.value as TripDocumentType)}
            className="min-w-0 flex-1 rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
          >
            {TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
          <button
            onClick={() => fileInput.current?.click()}
            disabled={busy}
            className="shrink-0 rounded-xl bg-gradient-to-br from-brand-600 to-brand-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-brand-500/25 disabled:opacity-60"
          >
            {busy ? 'Uploading…' : 'Choose file'}
          </button>
        </div>
        <input
          ref={fileInput}
          type="file"
          accept="image/png,image/jpeg,image/webp,application/pdf"
          className="hidden"
          onChange={(e) => void handleFile(e.target.files?.[0])}
        />
      </div>

      {error && (
        <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900 ring-1 ring-amber-200">{error}</p>
      )}

      {documents === null && !error && <p className="text-sm text-slate-400">Loading your documents…</p>}

      {documents !== null && (
        <>
          <Section title="Yours" empty="Nothing yet — add your passport above." rows={mine} onChanged={load} />
          <Section
            title="Shared for this trip"
            empty="Holiday Vibez hasn't added anything yet."
            rows={shared}
            onChanged={load}
          />
        </>
      )}

      <p className="px-1 text-xs text-slate-400">
        Only you can see the documents under “Yours” — not other travellers on this booking. Everyone on the
        booking can see the shared ones.
      </p>
    </div>
  );
}

function Section({
  title,
  empty,
  rows,
  onChanged,
}: {
  title: string;
  empty: string;
  rows: TripDocument[];
  onChanged: () => Promise<void>;
}) {
  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">{title}</p>
      {rows.length === 0 ? (
        <p className="rounded-xl bg-white px-4 py-3 text-sm text-slate-400 ring-1 ring-slate-200/70">{empty}</p>
      ) : (
        <div className="space-y-2">
          {rows.map((doc) => (
            <div
              key={doc.id}
              className="flex items-center gap-3 rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-200/70"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-slate-800">{doc.label}</p>
                <p className="text-xs text-slate-500">
                  {TYPE_LABELS[doc.type]} · {formatSize(doc.sizeBytes)}
                  {doc.addedByStaff ? ' · added by Holiday Vibez' : ''}
                </p>
              </div>
              <button
                onClick={() => void openDocument(doc)}
                className="shrink-0 rounded-lg px-3 py-1.5 text-sm font-semibold text-brand-700 ring-1 ring-brand-200"
              >
                Open
              </button>
              {/* Staff-added files stay put — a traveller deleting their own
                  voucher would just create a support call. */}
              {!doc.addedByStaff && (
                <button
                  onClick={async () => {
                    await deleteDocument(doc.id);
                    await onChanged();
                  }}
                  aria-label={`Remove ${doc.label}`}
                  className="shrink-0 px-1 text-slate-300"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
