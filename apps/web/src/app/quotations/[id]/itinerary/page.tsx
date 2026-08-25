'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { AppShell } from '@/components/AppShell';
import { api, ApiError } from '@/lib/api';
import { RoomCategory, TransportationType, ItineraryNoteType, type ItineraryDTO, type ItineraryDayDTO } from '@holiday-vibez/shared';

const ROOM_CATEGORY_OPTIONS = [RoomCategory.SINGLE, RoomCategory.DOUBLE, RoomCategory.TRIPLE, RoomCategory.QUAD, RoomCategory.CWB, RoomCategory.CNB];
const ROOM_CATEGORY_LABELS: Record<string, string> = {
  SINGLE: 'Single',
  DOUBLE: 'Double',
  TRIPLE: 'Triple',
  QUAD: 'Quad',
  CWB: 'Child With Bed',
  CNB: 'Child No Bed',
};
const TRANSPORT_OPTIONS = [TransportationType.PRIVATE, TransportationType.SIC];
const NOTE_TYPE_OPTIONS = [ItineraryNoteType.VISA, ItineraryNoteType.MEAL, ItineraryNoteType.FLIGHT, ItineraryNoteType.LEISURE, ItineraryNoteType.CRUISE];

type ActiveForm = { dayId: string; kind: 'accommodation' | 'activity' | 'transportation' | 'note' } | null;

const emptyAccommodation = { hotelName: '', city: '', checkInDate: '', checkOutDate: '', nights: '1', roomCategory: RoomCategory.DOUBLE as string, numberOfRooms: '1', checkInTime: '', checkOutTime: '', description: '' };
const emptyActivity = { destination: '', activityName: '', description: '' };
const emptyTransportation = { type: TransportationType.PRIVATE as string, description: '' };
const emptyNote = { type: ItineraryNoteType.MEAL as string, description: '' };

export default function ItineraryBuilderPage() {
  const { id } = useParams<{ id: string }>();
  const [itinerary, setItinerary] = useState<ItineraryDTO | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [terms, setTerms] = useState({ bookingPaymentTerms: '', pricingTerms: '', inclusionsExclusions: '', cancellationRefundPolicy: '', importantInstructions: '' });
  const [savingTerms, setSavingTerms] = useState(false);
  const [addingDay, setAddingDay] = useState(false);

  const [activeForm, setActiveForm] = useState<ActiveForm>(null);
  const [accommodationForm, setAccommodationForm] = useState(emptyAccommodation);
  const [activityForm, setActivityForm] = useState(emptyActivity);
  const [transportForm, setTransportForm] = useState(emptyTransportation);
  const [noteForm, setNoteForm] = useState(emptyNote);

  async function load() {
    try {
      const data = await api.get<ItineraryDTO>(`/quotations/${id}/itinerary`);
      setItinerary(data);
      setTerms({
        bookingPaymentTerms: data.bookingPaymentTerms ?? '',
        pricingTerms: data.pricingTerms ?? '',
        inclusionsExclusions: data.inclusionsExclusions ?? '',
        cancellationRefundPolicy: data.cancellationRefundPolicy ?? '',
        importantInstructions: data.importantInstructions ?? '',
      });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load itinerary');
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function handleSaveTerms(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSavingTerms(true);
    try {
      await api.put(`/quotations/${id}/itinerary/terms`, terms);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to save package terms');
    } finally {
      setSavingTerms(false);
    }
  }

  async function handleAddDay() {
    setError(null);
    setAddingDay(true);
    try {
      const nextDayNumber = (itinerary?.days.length ?? 0) + 1;
      await api.post(`/quotations/${id}/itinerary/days`, { dayNumber: nextDayNumber });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to add day');
    } finally {
      setAddingDay(false);
    }
  }

  async function handleRemoveDay(dayId: string) {
    setError(null);
    try {
      await api.delete(`/quotations/${id}/itinerary/days/${dayId}`);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to remove day');
    }
  }

  async function handleUpdateDay(dayId: string, patch: { date?: string; title?: string }) {
    setError(null);
    try {
      await api.put(`/quotations/${id}/itinerary/days/${dayId}`, patch);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to update day');
    }
  }

  function openForm(dayId: string, kind: NonNullable<ActiveForm>['kind']) {
    setActiveForm({ dayId, kind });
    setAccommodationForm(emptyAccommodation);
    setActivityForm(emptyActivity);
    setTransportForm(emptyTransportation);
    setNoteForm(emptyNote);
  }

  async function handleAddAccommodation(e: FormEvent, dayId: string) {
    e.preventDefault();
    setError(null);
    try {
      await api.post(`/quotations/${id}/itinerary/days/${dayId}/accommodations`, {
        ...accommodationForm,
        nights: Number(accommodationForm.nights),
        numberOfRooms: Number(accommodationForm.numberOfRooms),
        checkInTime: accommodationForm.checkInTime || undefined,
        checkOutTime: accommodationForm.checkOutTime || undefined,
        description: accommodationForm.description || undefined,
      });
      setActiveForm(null);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to add accommodation');
    }
  }

  async function handleAddActivity(e: FormEvent, dayId: string) {
    e.preventDefault();
    setError(null);
    try {
      await api.post(`/quotations/${id}/itinerary/days/${dayId}/activities`, { ...activityForm, description: activityForm.description || undefined });
      setActiveForm(null);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to add activity');
    }
  }

  async function handleAddTransportation(e: FormEvent, dayId: string) {
    e.preventDefault();
    setError(null);
    try {
      await api.post(`/quotations/${id}/itinerary/days/${dayId}/transportations`, { ...transportForm, description: transportForm.description || undefined });
      setActiveForm(null);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to add transportation');
    }
  }

  async function handleAddNote(e: FormEvent, dayId: string) {
    e.preventDefault();
    setError(null);
    try {
      await api.post(`/quotations/${id}/itinerary/days/${dayId}/notes`, { ...noteForm, description: noteForm.description || undefined });
      setActiveForm(null);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to add note');
    }
  }

  async function handleRemove(kind: 'accommodations' | 'activities' | 'transportations' | 'notes', dayId: string, itemId: string) {
    setError(null);
    try {
      await api.delete(`/quotations/${id}/itinerary/days/${dayId}/${kind}/${itemId}`);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to remove item');
    }
  }

  const inputClass = 'w-full rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-900 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-100 transition-colors';

  if (!itinerary) {
    return (
      <AppShell>
        <p className="text-sm text-slate-500">{error ?? 'Loading...'}</p>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-brand-700">Itinerary Builder</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Day-wise itinerary and package terms for this quotation.</p>
        </div>
        <a href={`/quotations/${id}`} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:border-brand-200 hover:bg-white dark:hover:bg-slate-800 hover:text-brand">
          Back to quotation
        </a>
      </div>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      <div className="mt-6 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Day-wise Itinerary</h2>
        <button onClick={handleAddDay} disabled={addingDay} className="rounded-xl bg-gradient-to-br from-brand-600 to-brand-500 px-3 py-1.5 text-sm font-semibold text-white shadow-md shadow-brand-500/25 transition hover:opacity-90 disabled:opacity-50">
          {addingDay ? 'Adding…' : '+ Add day'}
        </button>
      </div>

      <div className="mt-3 space-y-4">
        {itinerary.days.map((day) => (
          <DayCard
            key={day.id}
            day={day}
            inputClass={inputClass}
            activeForm={activeForm}
            accommodationForm={accommodationForm}
            setAccommodationForm={setAccommodationForm}
            activityForm={activityForm}
            setActivityForm={setActivityForm}
            transportForm={transportForm}
            setTransportForm={setTransportForm}
            noteForm={noteForm}
            setNoteForm={setNoteForm}
            openForm={openForm}
            closeForm={() => setActiveForm(null)}
            onUpdateDay={handleUpdateDay}
            onRemoveDay={handleRemoveDay}
            onAddAccommodation={handleAddAccommodation}
            onAddActivity={handleAddActivity}
            onAddTransportation={handleAddTransportation}
            onAddNote={handleAddNote}
            onRemove={handleRemove}
          />
        ))}
        {itinerary.days.length === 0 && (
          <p className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 px-4 py-6 text-center text-sm text-slate-400">No days added yet.</p>
        )}
      </div>

      <div className="mt-8">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Package Terms</h2>
        <form onSubmit={handleSaveTerms} className="mt-2 grid grid-cols-1 gap-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-card p-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">Booking and Payment</label>
            <textarea rows={3} value={terms.bookingPaymentTerms} onChange={(e) => setTerms({ ...terms, bookingPaymentTerms: e.target.value })} className={inputClass} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">Pricing</label>
            <textarea rows={3} value={terms.pricingTerms} onChange={(e) => setTerms({ ...terms, pricingTerms: e.target.value })} className={inputClass} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">Inclusions &amp; Exclusions</label>
            <textarea rows={3} value={terms.inclusionsExclusions} onChange={(e) => setTerms({ ...terms, inclusionsExclusions: e.target.value })} className={inputClass} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">Cancellations and Refunds</label>
            <textarea rows={3} value={terms.cancellationRefundPolicy} onChange={(e) => setTerms({ ...terms, cancellationRefundPolicy: e.target.value })} className={inputClass} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">Important Instructions</label>
            <textarea rows={3} value={terms.importantInstructions} onChange={(e) => setTerms({ ...terms, importantInstructions: e.target.value })} className={inputClass} />
          </div>
          <button type="submit" disabled={savingTerms} className="self-start rounded-xl bg-gradient-to-br from-brand-600 to-brand-500 shadow-md shadow-brand-500/25 px-3 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50">
            {savingTerms ? 'Saving…' : 'Save package terms'}
          </button>
        </form>
      </div>
    </AppShell>
  );
}

interface DayCardProps {
  day: ItineraryDayDTO;
  inputClass: string;
  activeForm: ActiveForm;
  accommodationForm: typeof emptyAccommodation;
  setAccommodationForm: (v: typeof emptyAccommodation) => void;
  activityForm: typeof emptyActivity;
  setActivityForm: (v: typeof emptyActivity) => void;
  transportForm: typeof emptyTransportation;
  setTransportForm: (v: typeof emptyTransportation) => void;
  noteForm: typeof emptyNote;
  setNoteForm: (v: typeof emptyNote) => void;
  openForm: (dayId: string, kind: NonNullable<ActiveForm>['kind']) => void;
  closeForm: () => void;
  onUpdateDay: (dayId: string, patch: { date?: string; title?: string }) => void;
  onRemoveDay: (dayId: string) => void;
  onAddAccommodation: (e: FormEvent, dayId: string) => void;
  onAddActivity: (e: FormEvent, dayId: string) => void;
  onAddTransportation: (e: FormEvent, dayId: string) => void;
  onAddNote: (e: FormEvent, dayId: string) => void;
  onRemove: (kind: 'accommodations' | 'activities' | 'transportations' | 'notes', dayId: string, itemId: string) => void;
}

function DayCard(props: DayCardProps) {
  const { day, inputClass, activeForm } = props;
  const [title, setTitle] = useState(day.title ?? '');
  const [date, setDate] = useState(day.date ? day.date.slice(0, 10) : '');

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-card p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-lg bg-brand-50 px-2.5 py-1 text-sm font-bold text-brand dark:bg-brand-500/20">Day {day.dayNumber}</span>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} onBlur={() => props.onUpdateDay(day.id, { date, title })} className="rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-900 px-2 py-1 text-sm" />
        <input placeholder="Day title (optional)" value={title} onChange={(e) => setTitle(e.target.value)} onBlur={() => props.onUpdateDay(day.id, { date, title })} className="flex-1 min-w-[160px] rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-900 px-2 py-1 text-sm" />
        <button onClick={() => props.onRemoveDay(day.id)} className="text-xs text-red-600 hover:underline">Remove day</button>
      </div>

      <ItemSection
        label="Accommodation"
        items={day.accommodations.map((a) => ({
          id: a.id,
          text: `${a.hotelName} — ${a.city} · ${new Date(a.checkInDate).toLocaleDateString()} → ${new Date(a.checkOutDate).toLocaleDateString()} (${a.nights}n) · ${ROOM_CATEGORY_LABELS[a.roomCategory]} × ${a.numberOfRooms}${a.description ? ` · ${a.description}` : ''}`,
        }))}
        onAdd={() => props.openForm(day.id, 'accommodation')}
        onRemove={(itemId) => props.onRemove('accommodations', day.id, itemId)}
      />
      {activeForm?.dayId === day.id && activeForm.kind === 'accommodation' && (
        <form onSubmit={(e) => props.onAddAccommodation(e, day.id)} className="mt-2 grid grid-cols-1 gap-2 rounded-lg border border-slate-100 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-900/30 p-3 sm:grid-cols-3">
          <input required placeholder="Hotel name" value={props.accommodationForm.hotelName} onChange={(e) => props.setAccommodationForm({ ...props.accommodationForm, hotelName: e.target.value })} className={inputClass} />
          <input required placeholder="City" value={props.accommodationForm.city} onChange={(e) => props.setAccommodationForm({ ...props.accommodationForm, city: e.target.value })} className={inputClass} />
          <select value={props.accommodationForm.roomCategory} onChange={(e) => props.setAccommodationForm({ ...props.accommodationForm, roomCategory: e.target.value })} className={inputClass}>
            {ROOM_CATEGORY_OPTIONS.map((r) => <option key={r} value={r}>{ROOM_CATEGORY_LABELS[r]}</option>)}
          </select>
          <label className="text-xs text-slate-500 dark:text-slate-400">Check-in date<input required type="date" value={props.accommodationForm.checkInDate} onChange={(e) => props.setAccommodationForm({ ...props.accommodationForm, checkInDate: e.target.value })} className={inputClass} /></label>
          <label className="text-xs text-slate-500 dark:text-slate-400">Check-out date<input required type="date" value={props.accommodationForm.checkOutDate} onChange={(e) => props.setAccommodationForm({ ...props.accommodationForm, checkOutDate: e.target.value })} className={inputClass} /></label>
          <label className="text-xs text-slate-500 dark:text-slate-400">No. of nights<input required type="number" min={1} value={props.accommodationForm.nights} onChange={(e) => props.setAccommodationForm({ ...props.accommodationForm, nights: e.target.value })} className={inputClass} /></label>
          <label className="text-xs text-slate-500 dark:text-slate-400">No. of rooms<input required type="number" min={1} value={props.accommodationForm.numberOfRooms} onChange={(e) => props.setAccommodationForm({ ...props.accommodationForm, numberOfRooms: e.target.value })} className={inputClass} /></label>
          <label className="text-xs text-slate-500 dark:text-slate-400">Check-in time<input placeholder="14:00" value={props.accommodationForm.checkInTime} onChange={(e) => props.setAccommodationForm({ ...props.accommodationForm, checkInTime: e.target.value })} className={inputClass} /></label>
          <label className="text-xs text-slate-500 dark:text-slate-400">Check-out time<input placeholder="11:00" value={props.accommodationForm.checkOutTime} onChange={(e) => props.setAccommodationForm({ ...props.accommodationForm, checkOutTime: e.target.value })} className={inputClass} /></label>
          <textarea placeholder="Description" value={props.accommodationForm.description} onChange={(e) => props.setAccommodationForm({ ...props.accommodationForm, description: e.target.value })} className={`${inputClass} sm:col-span-3`} rows={2} />
          <div className="flex gap-2 sm:col-span-3">
            <button type="submit" className="rounded-xl bg-gradient-to-br from-brand-600 to-brand-500 shadow-md shadow-brand-500/25 px-3 py-1.5 text-sm font-medium text-white hover:opacity-90">Add</button>
            <button type="button" onClick={props.closeForm} className="text-sm text-slate-500 hover:underline">Cancel</button>
          </div>
        </form>
      )}

      <ItemSection
        label="Activity"
        items={day.activities.map((a) => ({ id: a.id, text: `${a.activityName} — ${a.destination}${a.description ? ` · ${a.description}` : ''}` }))}
        onAdd={() => props.openForm(day.id, 'activity')}
        onRemove={(itemId) => props.onRemove('activities', day.id, itemId)}
      />
      {activeForm?.dayId === day.id && activeForm.kind === 'activity' && (
        <form onSubmit={(e) => props.onAddActivity(e, day.id)} className="mt-2 grid grid-cols-1 gap-2 rounded-lg border border-slate-100 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-900/30 p-3 sm:grid-cols-3">
          <input required placeholder="Destination" value={props.activityForm.destination} onChange={(e) => props.setActivityForm({ ...props.activityForm, destination: e.target.value })} className={inputClass} />
          <input required placeholder="Activity name" value={props.activityForm.activityName} onChange={(e) => props.setActivityForm({ ...props.activityForm, activityName: e.target.value })} className={inputClass} />
          <input placeholder="Description" value={props.activityForm.description} onChange={(e) => props.setActivityForm({ ...props.activityForm, description: e.target.value })} className={inputClass} />
          <div className="flex gap-2 sm:col-span-3">
            <button type="submit" className="rounded-xl bg-gradient-to-br from-brand-600 to-brand-500 shadow-md shadow-brand-500/25 px-3 py-1.5 text-sm font-medium text-white hover:opacity-90">Add</button>
            <button type="button" onClick={props.closeForm} className="text-sm text-slate-500 hover:underline">Cancel</button>
          </div>
        </form>
      )}

      <ItemSection
        label="Transportation"
        items={day.transportations.map((t) => ({ id: t.id, text: `${t.type}${t.description ? ` · ${t.description}` : ''}` }))}
        onAdd={() => props.openForm(day.id, 'transportation')}
        onRemove={(itemId) => props.onRemove('transportations', day.id, itemId)}
      />
      {activeForm?.dayId === day.id && activeForm.kind === 'transportation' && (
        <form onSubmit={(e) => props.onAddTransportation(e, day.id)} className="mt-2 grid grid-cols-1 gap-2 rounded-lg border border-slate-100 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-900/30 p-3 sm:grid-cols-3">
          <select value={props.transportForm.type} onChange={(e) => props.setTransportForm({ ...props.transportForm, type: e.target.value })} className={inputClass}>
            {TRANSPORT_OPTIONS.map((t) => <option key={t} value={t}>{t === 'SIC' ? 'SIC (Seat-in-Coach)' : 'Private'}</option>)}
          </select>
          <input placeholder="Description" value={props.transportForm.description} onChange={(e) => props.setTransportForm({ ...props.transportForm, description: e.target.value })} className={`${inputClass} sm:col-span-2`} />
          <div className="flex gap-2 sm:col-span-3">
            <button type="submit" className="rounded-xl bg-gradient-to-br from-brand-600 to-brand-500 shadow-md shadow-brand-500/25 px-3 py-1.5 text-sm font-medium text-white hover:opacity-90">Add</button>
            <button type="button" onClick={props.closeForm} className="text-sm text-slate-500 hover:underline">Cancel</button>
          </div>
        </form>
      )}

      <ItemSection
        label="Visa / Meal / Flight / Leisure / Cruise"
        items={day.notes.map((n) => ({ id: n.id, text: `${n.type}${n.description ? ` · ${n.description}` : ''}` }))}
        onAdd={() => props.openForm(day.id, 'note')}
        onRemove={(itemId) => props.onRemove('notes', day.id, itemId)}
      />
      {activeForm?.dayId === day.id && activeForm.kind === 'note' && (
        <form onSubmit={(e) => props.onAddNote(e, day.id)} className="mt-2 grid grid-cols-1 gap-2 rounded-lg border border-slate-100 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-900/30 p-3 sm:grid-cols-3">
          <select value={props.noteForm.type} onChange={(e) => props.setNoteForm({ ...props.noteForm, type: e.target.value })} className={inputClass}>
            {NOTE_TYPE_OPTIONS.map((t) => <option key={t} value={t}>{t.charAt(0) + t.slice(1).toLowerCase()}</option>)}
          </select>
          <input placeholder="Description" value={props.noteForm.description} onChange={(e) => props.setNoteForm({ ...props.noteForm, description: e.target.value })} className={`${inputClass} sm:col-span-2`} />
          <div className="flex gap-2 sm:col-span-3">
            <button type="submit" className="rounded-xl bg-gradient-to-br from-brand-600 to-brand-500 shadow-md shadow-brand-500/25 px-3 py-1.5 text-sm font-medium text-white hover:opacity-90">Add</button>
            <button type="button" onClick={props.closeForm} className="text-sm text-slate-500 hover:underline">Cancel</button>
          </div>
        </form>
      )}
    </div>
  );
}

function ItemSection({ label, items, onAdd, onRemove }: { label: string; items: { id: string; text: string }[]; onAdd: () => void; onRemove: (id: string) => void }) {
  return (
    <div className="mt-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</p>
        <button onClick={onAdd} className="text-xs text-brand hover:underline">+ Add</button>
      </div>
      {items.length > 0 ? (
        <ul className="mt-1 space-y-1">
          {items.map((item) => (
            <li key={item.id} className="flex items-start justify-between gap-2 rounded-lg bg-slate-50 dark:bg-slate-900/40 px-2.5 py-1.5 text-sm text-slate-700 dark:text-slate-200">
              <span>{item.text}</span>
              <button onClick={() => onRemove(item.id)} className="shrink-0 text-xs text-red-600 hover:underline">Remove</button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-1 text-xs text-slate-400">None added.</p>
      )}
    </div>
  );
}
