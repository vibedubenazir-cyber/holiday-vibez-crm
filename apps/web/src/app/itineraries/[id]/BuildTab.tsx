'use client';

import { useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { uploadFile } from '@/lib/upload';
import { FormattedTextArea } from '@/components/FormattedTextArea';
import { RichTextEditor } from '@/components/RichTextEditor';
import { ItineraryEventType, type ItineraryPlanDTO, type ItineraryPlanEventDTO } from '@holiday-vibez/shared';
import { EventModal, EVENT_TYPE_LABELS } from './EventModal';

const EVENT_TYPES = Object.values(ItineraryEventType);

function formatDate(value: string | null) {
  if (!value) return '';
  return new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

const TERMS_FIELDS = [
  ['bookingAndPayment', 'Booking and Payment'],
  ['pricingAndInclusions', 'Pricing and Inclusions'],
  ['cancellationsAndRefunds', 'Cancellations and Refunds'],
  ['liability', 'Liability'],
] as const;
type TermsKey = (typeof TERMS_FIELDS)[number][0];
type TermsTitleKey = `${TermsKey}Title`;

const EVENT_TYPE_ICONS: Record<ItineraryEventType, string> = {
  [ItineraryEventType.ACCOMMODATION]: '🏨',
  [ItineraryEventType.ACTIVITY]: '🚶',
  [ItineraryEventType.TRANSPORTATION]: '🚐',
  [ItineraryEventType.VISA]: '📄',
  [ItineraryEventType.MEAL]: '🍽️',
  [ItineraryEventType.FLIGHT]: '✈️',
  [ItineraryEventType.LEISURE]: '🌴',
  [ItineraryEventType.CRUISE]: '🚢',
};

// A single line of the key facts a consultant scans for — different per type,
// mirroring the density of the reference's Pricing-tab line items so the
// Build tab doesn't require opening every card just to check dates/times.
function eventSubtitle(event: ItineraryPlanEventDTO): string {
  const details = (event.details ?? {}) as Record<string, unknown>;
  const parts: string[] = [];
  if (event.type === ItineraryEventType.ACCOMMODATION) {
    if (details.roomName) parts.push(String(details.roomName));
    if (details.mealPlan) parts.push(String(details.mealPlan));
    if (event.date && event.endDate) parts.push(`${formatDate(event.date)} to ${formatDate(event.endDate)}`);
    else if (event.date) parts.push(formatDate(event.date));
  } else {
    if (event.date) parts.push(formatDate(event.date));
    if (event.showTime && event.startTime) parts.push(event.endTime ? `${event.startTime} to ${event.endTime}` : event.startTime);
  }
  if (event.type === ItineraryEventType.FLIGHT && details.flightNumber) {
    parts.unshift(String(details.flightNumber));
  }
  return parts.join(' · ');
}

export function BuildTab({ plan, onReload }: { plan: ItineraryPlanDTO; onReload: () => void }) {
  const [title, setTitle] = useState(plan.title);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openDropdownDayId, setOpenDropdownDayId] = useState<string | null>(null);
  const [editingDayId, setEditingDayId] = useState<string | null>(null);
  const [editDayDate, setEditDayDate] = useState('');
  const [modalState, setModalState] = useState<{ dayId: string; type: ItineraryEventType; existing?: ItineraryPlanEventDTO } | null>(null);
  const [savingTerms, setSavingTerms] = useState(false);
  const [terms, setTerms] = useState<Record<TermsKey, string>>({
    bookingAndPayment: plan.packageTerms?.bookingAndPayment ?? '',
    pricingAndInclusions: plan.packageTerms?.pricingAndInclusions ?? '',
    cancellationsAndRefunds: plan.packageTerms?.cancellationsAndRefunds ?? '',
    liability: plan.packageTerms?.liability ?? '',
  });
  // Headings are editable per itinerary; the default label is shown until
  // renamed, and clearing the input falls back to the default again.
  const [termsTitles, setTermsTitles] = useState<Record<TermsKey, string>>({
    bookingAndPayment: plan.packageTerms?.bookingAndPaymentTitle ?? 'Booking and Payment',
    pricingAndInclusions: plan.packageTerms?.pricingAndInclusionsTitle ?? 'Pricing and Inclusions',
    cancellationsAndRefunds: plan.packageTerms?.cancellationsAndRefundsTitle ?? 'Cancellations and Refunds',
    liability: plan.packageTerms?.liabilityTitle ?? 'Liability',
  });
  const [uploadingGallery, setUploadingGallery] = useState(false);

  async function handleTitleBlur() {
    if (title === plan.title) return;
    try {
      await api.patch(`/itineraries/${plan.id}`, { title });
      onReload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to save title');
    }
  }

  async function handleCoverUpload(file: File) {
    setUploadingCover(true);
    try {
      const url = await uploadFile(file);
      await api.patch(`/itineraries/${plan.id}`, { coverPhotoUrl: url });
      onReload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Cover photo upload failed');
    } finally {
      setUploadingCover(false);
    }
  }

  async function handleAddDay() {
    const nextDayNumber = plan.days.length ? Math.max(...plan.days.map((d) => d.dayNumber)) + 1 : 1;
    try {
      await api.post(`/itineraries/${plan.id}/days`, { dayNumber: nextDayNumber });
      onReload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to add day');
    }
  }

  async function handleRemoveDay(dayId: string) {
    if (!confirm('Remove this day and all its events?')) return;
    try {
      await api.delete(`/itineraries/${plan.id}/days/${dayId}`);
      onReload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to remove day');
    }
  }

  function startEditDay(dayId: string, date: string | null) {
    setEditingDayId(dayId);
    setEditDayDate(date ? date.slice(0, 10) : '');
  }

  async function handleSaveDayDate(dayId: string) {
    try {
      await api.patch(`/itineraries/${plan.id}/days/${dayId}`, { date: editDayDate || undefined });
      setEditingDayId(null);
      onReload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to save day');
    }
  }

  async function handleRemoveEvent(dayId: string, eventId: string) {
    try {
      await api.delete(`/itineraries/${plan.id}/days/${dayId}/events/${eventId}`);
      onReload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to remove event');
    }
  }

  async function handleSaveTerms() {
    setSavingTerms(true);
    try {
      const payload: Record<string, string | null> = Object.fromEntries(
        TERMS_FIELDS.map(([key]) => [key, terms[key].trim()]),
      );
      for (const [key, defaultLabel] of TERMS_FIELDS) {
        const title = termsTitles[key].trim();
        payload[`${key}Title` satisfies TermsTitleKey] = title && title !== defaultLabel ? title : null;
      }
      await api.put(`/itineraries/${plan.id}/package-terms`, payload);
      onReload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to save package terms');
    } finally {
      setSavingTerms(false);
    }
  }

  async function handleGalleryUpload(file: File) {
    setUploadingGallery(true);
    try {
      const url = await uploadFile(file);
      await api.post(`/itineraries/${plan.id}/images`, { url });
      onReload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Image upload failed');
    } finally {
      setUploadingGallery(false);
    }
  }

  async function handleRemoveImage(imageId: string) {
    try {
      await api.delete(`/itineraries/${plan.id}/images/${imageId}`);
      onReload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to remove image');
    }
  }

  return (
    <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[220px_1fr]">
      <div className="order-2 lg:order-1">
        <div className="sticky top-4 rounded-xl border border-slate-200 bg-white dark:bg-slate-800 p-3 text-sm">
          <p className="mb-2 text-xs font-semibold uppercase text-slate-400">Summary</p>
          <ul className="space-y-1">
            {plan.days.map((day) => (
              <li key={day.id}>
                <a href={`#day-${day.id}`} className="text-slate-600 hover:text-brand dark:text-slate-300">
                  Day {day.dayNumber}
                </a>
              </li>
            ))}
            <li>
              <a href="#package-terms" className="text-slate-600 hover:text-brand dark:text-slate-300">
                Package Terms
              </a>
            </li>
            <li>
              <a href="#image-gallery" className="text-slate-600 hover:text-brand dark:text-slate-300">
                Image Gallery
              </a>
            </li>
          </ul>
        </div>
      </div>

      <div className="order-1 lg:order-2">
        {error && <p className="mb-2 text-sm text-red-600">{error}</p>}

        <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-slate-100 dark:bg-slate-800" style={{ height: 200 }}>
          {plan.coverPhotoUrl && <img src={plan.coverPhotoUrl} alt="" className="h-full w-full object-cover" />}
          <label className="absolute bottom-3 right-3 cursor-pointer rounded-lg bg-white/90 px-3 py-1.5 text-xs font-medium text-slate-700 shadow hover:bg-white">
            {uploadingCover ? 'Uploading…' : 'Change Cover Photo'}
            <input type="file" accept=".png,.jpg,.jpeg,.gif,.webp" className="hidden" disabled={uploadingCover} onChange={(e) => e.target.files?.[0] && handleCoverUpload(e.target.files[0])} />
          </label>
        </div>

        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={handleTitleBlur}
          className="mt-3 w-full rounded-lg border border-transparent px-2 py-1 text-2xl font-bold text-slate-800 hover:border-slate-200 focus:border-brand focus:outline-none dark:text-slate-100"
        />
        <p className="px-2 text-sm text-slate-500 dark:text-slate-400">
          {plan.destinations.join(', ')} · Adult: {plan.adultsCount} | Child: {plan.childrenCount} | Infant: {plan.infantsCount}
        </p>

        <div className="mt-6 space-y-6">
          {plan.days.map((day) => (
            <div key={day.id} id={`day-${day.id}`} className="rounded-xl border border-slate-200 bg-white dark:bg-slate-800 p-4">
              <div className="mb-3 flex items-center justify-between">
                {editingDayId === day.id ? (
                  <div className="flex flex-wrap items-center gap-4 py-1">
                    <h3 className="font-semibold text-slate-800 dark:text-slate-100">Day {day.dayNumber}</h3>
                    <input
                      type="date"
                      value={editDayDate}
                      onChange={(e) => setEditDayDate(e.target.value)}
                      className="min-w-[9.5rem] rounded-lg border border-slate-300 px-3 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-900"
                    />
                    <div className="flex items-center gap-3">
                      <button onClick={() => handleSaveDayDate(day.id)} className="text-xs font-medium text-brand hover:underline">
                        Save
                      </button>
                      <button onClick={() => setEditingDayId(null)} className="text-xs text-slate-400 hover:text-slate-600">
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <h3 className="font-semibold text-slate-800 dark:text-slate-100">
                    Day {day.dayNumber} {day.date && <span className="ml-2 text-sm font-normal text-slate-400">{formatDate(day.date)}</span>}
                  </h3>
                )}
                {editingDayId !== day.id && (
                  <div className="flex gap-3">
                    <button onClick={() => startEditDay(day.id, day.date)} className="text-xs text-brand hover:underline">
                      Edit
                    </button>
                    <button onClick={() => handleRemoveDay(day.id)} className="text-xs text-slate-400 hover:text-red-500">
                      Remove Day
                    </button>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                {day.events.map((event) => {
                  const details = (event.details ?? {}) as Record<string, unknown>;
                  const hotelCategory = event.type === ItineraryEventType.ACCOMMODATION ? Number(details.hotelCategory) || 0 : 0;
                  const subtitle = eventSubtitle(event);
                  return (
                    <div key={event.id} className="flex items-start justify-between gap-3 rounded-lg border border-slate-100 dark:border-slate-700 p-2">
                      <div className="flex items-start gap-3">
                        {event.photoUrl ? (
                          <img src={event.photoUrl} alt="" className="h-10 w-10 shrink-0 rounded object-cover" />
                        ) : (
                          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-slate-50 text-lg dark:bg-slate-700">{EVENT_TYPE_ICONS[event.type]}</span>
                        )}
                        <div>
                          <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                            <span className="mr-2 rounded bg-brand-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-brand-700">{EVENT_TYPE_LABELS[event.type]}</span>
                            {event.name}
                            {hotelCategory > 0 && <span className="ml-1.5 text-amber-500">{'★'.repeat(hotelCategory)}</span>}
                          </p>
                          {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
                          {event.description && <p className="text-xs text-slate-400 line-clamp-1">{event.description}</p>}
                        </div>
                      </div>
                      <div className="flex shrink-0 gap-2 text-xs">
                        <button onClick={() => setModalState({ dayId: day.id, type: event.type, existing: event })} className="text-brand hover:underline">
                          Edit
                        </button>
                        <button onClick={() => handleRemoveEvent(day.id, event.id)} className="text-slate-400 hover:text-red-500">
                          Remove
                        </button>
                      </div>
                    </div>
                  );
                })}
                {day.events.length === 0 && <p className="text-xs text-slate-400">No events yet.</p>}
              </div>

              <div className="relative mt-3">
                <button
                  onClick={() => setOpenDropdownDayId(openDropdownDayId === day.id ? null : day.id)}
                  className="rounded-lg border border-brand-200 px-3 py-1.5 text-xs font-medium text-brand hover:bg-brand-50"
                >
                  + New Event
                </button>
                {openDropdownDayId === day.id && (
                  <div className="absolute left-0 top-9 z-10 w-48 rounded-lg border border-slate-200 bg-white dark:bg-slate-800 py-1 shadow-lg">
                    {EVENT_TYPES.map((type) => (
                      <button
                        key={type}
                        onClick={() => {
                          setModalState({ dayId: day.id, type });
                          setOpenDropdownDayId(null);
                        }}
                        className="block w-full px-3 py-1.5 text-left text-sm text-slate-600 hover:bg-brand-50 hover:text-brand dark:text-slate-300"
                      >
                        {EVENT_TYPE_LABELS[type]}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}

          <button onClick={handleAddDay} className="rounded-lg border border-dashed border-slate-300 px-4 py-2 text-sm text-slate-500 hover:border-brand hover:text-brand">
            + Add Day
          </button>
        </div>

        <div id="package-terms" className="mt-8 rounded-xl border border-slate-200 bg-white dark:bg-slate-800 p-4">
          <h3 className="mb-3 font-semibold text-slate-800 dark:text-slate-100">Package Terms</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {TERMS_FIELDS.map(([key, label]) => (
              <div key={key}>
                <input
                  value={termsTitles[key]}
                  onChange={(e) => setTermsTitles((prev) => ({ ...prev, [key]: e.target.value }))}
                  placeholder={label}
                  title="Section heading — shown to the client on the report and PDF"
                  className="w-full rounded-lg border border-transparent bg-transparent px-1 py-0.5 text-xs font-semibold text-slate-500 hover:border-slate-200 focus:border-brand-300 focus:bg-white focus:outline-none dark:hover:border-slate-600 dark:focus:bg-slate-900"
                />
                <div className="mt-1">
                  <RichTextEditor
                    value={terms[key]}
                    onChange={(v) => setTerms((prev) => ({ ...prev, [key]: v }))}
                    placeholder="Add terms…"
                  />
                </div>
              </div>
            ))}
          </div>
          <button onClick={handleSaveTerms} disabled={savingTerms} className="mt-3 rounded-xl bg-gradient-to-br from-brand-600 to-brand-500 shadow-md shadow-brand-500/25 px-3 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60">
            {savingTerms ? 'Saving…' : 'Save Package Terms'}
          </button>
        </div>

        <div id="image-gallery" className="mt-8 rounded-xl border border-slate-200 bg-white dark:bg-slate-800 p-4">
          <h3 className="mb-3 font-semibold text-slate-800 dark:text-slate-100">Image Gallery</h3>
          <div className="flex flex-wrap gap-3">
            {plan.images.map((img) => (
              <div key={img.id} className="group relative h-24 w-24">
                <img src={img.url} alt="" className="h-24 w-24 rounded-lg object-cover" />
                <button
                  onClick={() => handleRemoveImage(img.id)}
                  className="absolute -right-1 -top-1 hidden h-5 w-5 rounded-full bg-red-500 text-xs text-white group-hover:block"
                >
                  ✕
                </button>
              </div>
            ))}
            <label className="flex h-24 w-24 cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-slate-300 text-2xl text-slate-400 hover:border-brand hover:text-brand">
              {uploadingGallery ? '…' : '+'}
              <input type="file" accept=".png,.jpg,.jpeg,.gif,.webp" className="hidden" disabled={uploadingGallery} onChange={(e) => e.target.files?.[0] && handleGalleryUpload(e.target.files[0])} />
            </label>
          </div>
        </div>
      </div>

      {modalState && (
        <EventModal
          planId={plan.id}
          dayId={modalState.dayId}
          type={modalState.type}
          existing={modalState.existing}
          pricingOptions={plan.pricingOptions}
          onClose={() => setModalState(null)}
          onSaved={onReload}
        />
      )}
    </div>
  );
}
