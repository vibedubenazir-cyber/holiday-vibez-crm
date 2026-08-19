'use client';

import { useEffect, useState } from 'react';
import { Modal } from '@/components/Modal';
import { FormattedTextArea } from '@/components/FormattedTextArea';
import { api, ApiError } from '@/lib/api';
import { uploadFile } from '@/lib/upload';
import {
  ItineraryEventType,
  TransportationType,
  type HotelDTO,
  type ItineraryEventTemplateDTO,
  type ItineraryPlanEventDTO,
  type ItineraryPricingOptionDTO,
  type MealPlanDTO,
  type RoomTypeDTO,
} from '@holiday-vibez/shared';

export const EVENT_TYPE_LABELS: Record<ItineraryEventType, string> = {
  [ItineraryEventType.ACCOMMODATION]: 'Accommodation',
  [ItineraryEventType.ACTIVITY]: 'Activity',
  [ItineraryEventType.TRANSPORTATION]: 'Transportation',
  [ItineraryEventType.VISA]: 'Visa',
  [ItineraryEventType.MEAL]: 'Meal',
  [ItineraryEventType.FLIGHT]: 'Flight',
  [ItineraryEventType.LEISURE]: 'Leisure',
  [ItineraryEventType.CRUISE]: 'Cruise',
};

type AddOnRow = { name: string; price: string };

type FormState = {
  name: string;
  destination: string;
  date: string;
  endDate: string;
  startTime: string;
  endTime: string;
  showTime: boolean;
  description: string;
  bulletPoints: boolean;
  photoUrl: string;
  transferType: TransportationType | '';
  netAmount: string;
  markupPct: string;
  addOns: AddOnRow[];
  hotelCategory: string;
  roomName: string;
  mealPlan: string;
  single: string;
  double: string;
  triple: string;
  quad: string;
  cwb: string;
  cnb: string;
  mealType: string;
  flightNumber: string;
  fromDestination: string;
  toDestination: string;
  durationMinutes: string;
};

function emptyForm(type: ItineraryEventType): FormState {
  return {
    name: type === ItineraryEventType.LEISURE ? 'Day at Leisure' : '',
    destination: '',
    date: '',
    endDate: '',
    startTime: '',
    endTime: '',
    showTime: true,
    description: '',
    bulletPoints: false,
    photoUrl: '',
    transferType: '',
    netAmount: '',
    markupPct: '',
    addOns: [],
    hotelCategory: '',
    roomName: '',
    mealPlan: '',
    single: '',
    double: '',
    triple: '',
    quad: '',
    cwb: '',
    cnb: '',
    mealType: '',
    flightNumber: '',
    fromDestination: '',
    toDestination: '',
    durationMinutes: '',
  };
}

function formFromEvent(event: ItineraryPlanEventDTO): FormState {
  const details = (event.details ?? {}) as Record<string, unknown>;
  const str = (v: unknown) => (v === undefined || v === null ? '' : String(v));
  return {
    name: event.name,
    destination: event.destination ?? '',
    date: event.date ? event.date.slice(0, 10) : '',
    endDate: event.endDate ? event.endDate.slice(0, 10) : '',
    startTime: event.startTime ?? '',
    endTime: event.endTime ?? '',
    showTime: event.showTime,
    description: event.description ?? '',
    bulletPoints: Boolean(details.descriptionBullets),
    photoUrl: event.photoUrl ?? '',
    transferType: event.transferType ?? '',
    netAmount: event.netAmount !== null ? String(event.netAmount) : '',
    markupPct: event.markupPct !== null ? String(event.markupPct) : '',
    addOns: (event.addOns ?? []).map((a) => ({ name: a.name, price: String(a.price) })),
    hotelCategory: str(details.hotelCategory),
    roomName: str(details.roomName),
    mealPlan: str(details.mealPlan),
    single: str(details.single),
    double: str(details.double),
    triple: str(details.triple),
    quad: str(details.quad),
    cwb: str(details.cwb),
    cnb: str(details.cnb),
    mealType: str(details.mealType),
    flightNumber: str(details.flightNumber),
    fromDestination: str(details.fromDestination),
    toDestination: str(details.toDestination),
    durationMinutes: str(details.durationMinutes),
  };
}

const numOrUndef = (v: string) => (v === '' ? undefined : Number(v));

export function EventModal({
  planId,
  dayId,
  type,
  existing,
  pricingOptions,
  onClose,
  onSaved,
}: {
  planId: string;
  dayId: string;
  type: ItineraryEventType;
  existing?: ItineraryPlanEventDTO;
  pricingOptions?: ItineraryPricingOptionDTO[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<FormState>(existing ? formFromEvent(existing) : emptyForm(type));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [library, setLibrary] = useState<ItineraryEventTemplateDTO[]>([]);
  const [librarySearch, setLibrarySearch] = useState('');
  const [hotels, setHotels] = useState<HotelDTO[]>([]);
  const [mealPlans, setMealPlans] = useState<MealPlanDTO[]>([]);
  const [roomTypes, setRoomTypes] = useState<RoomTypeDTO[]>([]);
  const [pricingOptionId, setPricingOptionId] = useState<string>(() => {
    if (!existing) return pricingOptions?.[0]?.id ?? '';
    return pricingOptions?.find((o) => o.accommodations.some((a) => a.id === existing.id))?.id ?? '';
  });

  useEffect(() => {
    api
      .get<ItineraryEventTemplateDTO[]>(`/itinerary-event-templates?type=${type}`)
      .then(setLibrary)
      .catch(() => setLibrary([]));
    if (type === ItineraryEventType.ACCOMMODATION) {
      api.get<HotelDTO[]>('/hotels').then((h) => setHotels(h.filter((x) => x.active))).catch(() => setHotels([]));
      api.get<MealPlanDTO[]>('/meal-plans').then((m) => setMealPlans(m.filter((x) => x.active))).catch(() => setMealPlans([]));
      api.get<RoomTypeDTO[]>('/room-types').then((r) => setRoomTypes(r.filter((x) => x.active))).catch(() => setRoomTypes([]));
    }
  }, [type]);

  // Picking a hotel from the datalist lands here as a plain change event, so an
  // exact name match against the masters autofills the rest — category always
  // (the master is authoritative for stars), destination and net rate only when
  // still blank so a consultant's own values are never overwritten.
  function handleNameChange(value: string) {
    const hotel = type === ItineraryEventType.ACCOMMODATION ? hotels.find((h) => h.name === value) : undefined;
    if (!hotel) {
      setForm((f) => ({ ...f, name: value }));
      return;
    }
    setForm((f) => ({
      ...f,
      name: value,
      hotelCategory: String(hotel.category),
      destination: f.destination || hotel.destination,
      netAmount: f.netAmount || String(hotel.price),
    }));
  }

  const filteredLibrary = library.filter((t) => t.name.toLowerCase().includes(librarySearch.toLowerCase()) || t.destination.toLowerCase().includes(librarySearch.toLowerCase()));

  function applyTemplate(t: ItineraryEventTemplateDTO) {
    setForm((f) => ({ ...f, name: t.name, destination: t.destination, description: t.description ?? f.description, photoUrl: t.photoUrl ?? f.photoUrl }));
  }

  async function handlePhotoUpload(file: File) {
    setUploading(true);
    try {
      const url = await uploadFile(file);
      setForm((f) => ({ ...f, photoUrl: url }));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Photo upload failed');
    } finally {
      setUploading(false);
    }
  }

  function addAddOn() {
    setForm((f) => ({ ...f, addOns: [...f.addOns, { name: '', price: '' }] }));
  }
  function updateAddOn(idx: number, field: 'name' | 'price', value: string) {
    setForm((f) => ({ ...f, addOns: f.addOns.map((a, i) => (i === idx ? { ...a, [field]: value } : a)) }));
  }
  function removeAddOn(idx: number) {
    setForm((f) => ({ ...f, addOns: f.addOns.filter((_, i) => i !== idx) }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const details: Record<string, unknown> = {};
    if (type === ItineraryEventType.ACCOMMODATION) {
      if (form.hotelCategory) details.hotelCategory = Number(form.hotelCategory);
      if (form.roomName) details.roomName = form.roomName;
      if (form.mealPlan) details.mealPlan = form.mealPlan;
      for (const key of ['single', 'double', 'triple', 'quad', 'cwb', 'cnb'] as const) {
        if (form[key]) details[key] = Number(form[key]);
      }
    }
    if (form.bulletPoints) details.descriptionBullets = true;
    if (type === ItineraryEventType.MEAL && form.mealType) details.mealType = form.mealType;
    if (type === ItineraryEventType.FLIGHT) {
      if (form.flightNumber) details.flightNumber = form.flightNumber;
      if (form.fromDestination) details.fromDestination = form.fromDestination;
      if (form.toDestination) details.toDestination = form.toDestination;
      if (form.durationMinutes) details.durationMinutes = Number(form.durationMinutes);
    }

    const payload = {
      type,
      name: form.name,
      destination: form.destination || undefined,
      date: form.date || undefined,
      endDate: form.endDate || undefined,
      startTime: form.startTime || undefined,
      endTime: form.endTime || undefined,
      showTime: form.showTime,
      description: form.description || undefined,
      photoUrl: form.photoUrl || undefined,
      transferType: type === ItineraryEventType.TRANSPORTATION && form.transferType ? form.transferType : undefined,
      netAmount: numOrUndef(form.netAmount),
      markupPct: numOrUndef(form.markupPct),
      addOns: form.addOns.filter((a) => a.name).map((a) => ({ name: a.name, price: Number(a.price) || 0 })),
      details: Object.keys(details).length ? details : undefined,
    };

    try {
      let eventId = existing?.id;
      if (existing) {
        await api.patch(`/itineraries/${planId}/days/${dayId}/events/${existing.id}`, payload);
      } else {
        const created = await api.post<{ id: string }>(`/itineraries/${planId}/days/${dayId}/events`, payload);
        eventId = created.id;
      }

      // Accommodation belongs to exactly one Pricing Option — move it there
      // (and drop it from any other option it was previously attached to)
      // instead of requiring a separate trip to the Pricing tab.
      if (type === ItineraryEventType.ACCOMMODATION && eventId && pricingOptions) {
        await Promise.all(
          pricingOptions
            .filter((o) => {
              const has = o.accommodations.some((a) => a.id === eventId);
              const shouldHave = o.id === pricingOptionId;
              return has !== shouldHave;
            })
            .map((o) => {
              const current = o.accommodations.map((a) => a.id).filter((id) => id !== eventId);
              const next = o.id === pricingOptionId ? [...current, eventId as string] : current;
              return api.patch(`/itineraries/${planId}/pricing-options/${o.id}`, { accommodationEventIds: next });
            }),
        );
      }

      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to save event');
    } finally {
      setSaving(false);
    }
  }

  const inputCls = 'rounded-lg border border-slate-300 px-3 py-2 text-sm';

  return (
    <Modal title={`${existing ? 'Edit' : 'New'} ${EVENT_TYPE_LABELS[type]}`} onClose={onClose} wide>
      <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-3">
        {filteredLibrary.length > 0 && !existing && (
          <div className="col-span-2 rounded-lg border border-dashed border-brand-200 bg-brand-50/50 p-3">
            <input
              placeholder="Search library to fill from an existing template…"
              value={librarySearch}
              onChange={(e) => setLibrarySearch(e.target.value)}
              className={`${inputCls} w-full bg-white`}
            />
            <div className="mt-2 flex flex-wrap gap-2">
              {filteredLibrary.slice(0, 6).map((t) => (
                <button key={t.id} type="button" onClick={() => applyTemplate(t)} className="rounded-lg border border-brand-200 bg-white px-2 py-1 text-xs text-brand hover:bg-brand-100">
                  {t.name} · {t.destination}
                </button>
              ))}
            </div>
          </div>
        )}

        <input
          required
          placeholder={type === ItineraryEventType.ACCOMMODATION ? 'Hotel name (type to search Hotel Masters)' : 'Name'}
          list={type === ItineraryEventType.ACCOMMODATION && hotels.length > 0 ? 'hotel-masters' : undefined}
          value={form.name}
          onChange={(e) => handleNameChange(e.target.value)}
          className={`col-span-2 ${inputCls}`}
        />
        {type === ItineraryEventType.ACCOMMODATION && hotels.length > 0 && (
          <datalist id="hotel-masters">
            {hotels.map((h) => (
              <option key={h.id} value={h.name}>{`${h.destination} · ${h.category} Star`}</option>
            ))}
          </datalist>
        )}
        <input placeholder="Destination" value={form.destination} onChange={(e) => setForm({ ...form, destination: e.target.value })} className={inputCls} />
        <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className={inputCls} title={type === ItineraryEventType.ACCOMMODATION ? 'Check-in date' : 'Date'} />

        {type === ItineraryEventType.ACCOMMODATION && (
          <>
            <input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} className={inputCls} title="Check-out date" />
            <select value={form.hotelCategory} onChange={(e) => setForm({ ...form, hotelCategory: e.target.value })} className={inputCls}>
              <option value="">Hotel Category</option>
              {[1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>
                  {n} Star
                </option>
              ))}
            </select>
            <input placeholder="Room Name" list={roomTypes.length > 0 ? 'room-type-masters' : undefined} value={form.roomName} onChange={(e) => setForm({ ...form, roomName: e.target.value })} className={inputCls} />
            {roomTypes.length > 0 && (
              <datalist id="room-type-masters">
                {roomTypes.map((r) => (
                  <option key={r.id} value={r.name} />
                ))}
              </datalist>
            )}
            {mealPlans.length > 0 ? (
              <select value={form.mealPlan} onChange={(e) => setForm({ ...form, mealPlan: e.target.value })} className={inputCls}>
                <option value="">Meal Plan</option>
                {mealPlans.map((m) => (
                  <option key={m.id} value={m.name}>
                    {m.name}
                  </option>
                ))}
                {/* keep a legacy free-text value selectable when editing */}
                {form.mealPlan && !mealPlans.some((m) => m.name === form.mealPlan) && <option value={form.mealPlan}>{form.mealPlan}</option>}
              </select>
            ) : (
              <input placeholder="Meal Plan" value={form.mealPlan} onChange={(e) => setForm({ ...form, mealPlan: e.target.value })} className={inputCls} />
            )}
            {pricingOptions && pricingOptions.length > 0 && (
              <select value={pricingOptionId} onChange={(e) => setPricingOptionId(e.target.value)} className={inputCls}>
                <option value="">No Pricing Option</option>
                {pricingOptions.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))}
              </select>
            )}
            <input type="time" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} className={inputCls} title="Check-in time" />
            <input type="time" value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} className={inputCls} title="Check-out time" />
            {(['single', 'double', 'triple', 'quad', 'cwb', 'cnb'] as const).map((key) => (
              <label key={key} className="text-xs uppercase text-slate-500">
                {key}
                <input type="number" min={0} value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} className={`mt-1 w-full ${inputCls}`} />
              </label>
            ))}
          </>
        )}

        {(type === ItineraryEventType.ACTIVITY || type === ItineraryEventType.TRANSPORTATION || type === ItineraryEventType.FLIGHT || type === ItineraryEventType.CRUISE) && (
          <>
            <input type="time" placeholder="Start time" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} className={inputCls} />
            {type !== ItineraryEventType.CRUISE && (
              <input type="time" placeholder="End time" value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} className={inputCls} />
            )}
            <label className="col-span-2 flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
              <input type="checkbox" checked={form.showTime} onChange={(e) => setForm({ ...form, showTime: e.target.checked })} />
              Show Time on report
            </label>
          </>
        )}

        {type === ItineraryEventType.TRANSPORTATION && (
          <select value={form.transferType} onChange={(e) => setForm({ ...form, transferType: e.target.value as TransportationType })} className={inputCls}>
            <option value="">Transfer Type</option>
            <option value={TransportationType.PRIVATE}>Private</option>
            <option value={TransportationType.SIC}>Seat-in-Coach</option>
          </select>
        )}

        {type === ItineraryEventType.MEAL && (
          <>
            <input type="time" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} className={inputCls} />
            <input placeholder="Meal Type (e.g. Breakfast, Lunch)" value={form.mealType} onChange={(e) => setForm({ ...form, mealType: e.target.value })} className={inputCls} />
          </>
        )}

        {type === ItineraryEventType.VISA && <div />}

        {type === ItineraryEventType.FLIGHT && (
          <>
            <input placeholder="Flight No." value={form.flightNumber} onChange={(e) => setForm({ ...form, flightNumber: e.target.value })} className={inputCls} />
            <input placeholder="From Destination" value={form.fromDestination} onChange={(e) => setForm({ ...form, fromDestination: e.target.value })} className={inputCls} />
            <input placeholder="To Destination" value={form.toDestination} onChange={(e) => setForm({ ...form, toDestination: e.target.value })} className={inputCls} />
            <input type="number" min={0} placeholder="Flight Duration (minutes)" value={form.durationMinutes} onChange={(e) => setForm({ ...form, durationMinutes: e.target.value })} className={inputCls} />
          </>
        )}

        <div className="col-span-2">
          <div className="mb-1 flex items-center justify-between">
            <label className="text-xs text-slate-500">Description</label>
            <label className="flex items-center gap-1.5 text-xs text-slate-500">
              <input
                type="checkbox"
                checked={form.bulletPoints}
                onChange={(e) => setForm({ ...form, bulletPoints: e.target.checked })}
              />
              Show as bullet points in report
            </label>
          </div>
          <FormattedTextArea
            value={form.description}
            onChange={(v) => setForm({ ...form, description: v })}
            rows={5}
            placeholder="e.g. Museum of the Future (Photo Stop)"
          />
        </div>

        <div className="col-span-2">
          <label className="text-xs text-slate-500">Photo</label>
          <div className="mt-1 flex items-center gap-3">
            <input
              type="file"
              accept=".png,.jpg,.jpeg,.gif,.webp"
              disabled={uploading}
              onChange={(e) => e.target.files?.[0] && handlePhotoUpload(e.target.files[0])}
              className="text-xs text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-brand file:px-2 file:py-1.5 file:text-xs file:text-white"
            />
            {form.photoUrl && <img src={form.photoUrl} alt="" className="h-12 w-12 rounded-lg border border-slate-200 object-cover" />}
          </div>
        </div>

        <div className="col-span-2 border-t border-slate-100 pt-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">Add-ons</span>
            <button type="button" onClick={addAddOn} className="text-xs text-brand hover:underline">
              + Add option
            </button>
          </div>
          {form.addOns.map((a, idx) => (
            <div key={idx} className="mb-2 flex gap-2">
              <input placeholder="Add-on name" value={a.name} onChange={(e) => updateAddOn(idx, 'name', e.target.value)} className={`flex-1 ${inputCls}`} />
              <input type="number" min={0} placeholder="Price" value={a.price} onChange={(e) => updateAddOn(idx, 'price', e.target.value)} className={`w-28 ${inputCls}`} />
              <button type="button" onClick={() => removeAddOn(idx)} className="text-slate-400 hover:text-red-500">
                ✕
              </button>
            </div>
          ))}
        </div>

        <div className="col-span-2 border-t border-slate-100 pt-3">
          <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">Pricing (optional — feeds the Pricing tab)</span>
          <div className="mt-2 grid grid-cols-2 gap-3">
            <input type="number" min={0} placeholder="Net Amount (INR)" value={form.netAmount} onChange={(e) => setForm({ ...form, netAmount: e.target.value })} className={inputCls} />
            <input type="number" min={0} placeholder="Markup %" value={form.markupPct} onChange={(e) => setForm({ ...form, markupPct: e.target.value })} className={inputCls} />
          </div>
        </div>

        {error && <p className="col-span-2 text-sm text-red-600">{error}</p>}

        <button type="submit" disabled={saving} className="col-span-2 mt-2 rounded-xl bg-gradient-to-br from-brand-600 to-brand-500 shadow-md shadow-brand-500/25 px-3 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60">
          {saving ? 'Saving…' : existing ? 'Save Changes' : 'Add Event'}
        </button>
      </form>
    </Modal>
  );
}
