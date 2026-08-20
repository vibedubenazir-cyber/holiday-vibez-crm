'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Crown,
  CalendarClock,
  Clock,
  Mail,
  MessageCircle,
  Sparkles,
  PhoneOff,
  Send,
  Flame,
  FileCheck2,
  BellRing,
  PauseCircle,
  CheckCircle2,
  XCircle,
  Trash2,
  Plus,
  Wand2,
  FolderInput,
  Receipt,
  History as HistoryIcon,
  Phone,
  StickyNote,
  type LucideIcon,
} from 'lucide-react';
import { AppShell } from '@/components/AppShell';
import { BadgeDropdown, type BadgeDropdownOption } from '@/components/BadgeDropdown';
import { api, ApiError } from '@/lib/api';
import {
  CustomFieldType,
  LeadStatus,
  LeadTemperature,
  type BookingDTO,
  type ConversationDTO,
  type CustomFieldDefinitionDTO,
  type CustomFieldValueDTO,
  type InvoiceDTO,
  type ItineraryPlanSummaryDTO,
  type LeadNoteDTO,
  type LeadReminderDTO,
  type LeadSummaryDTO,
  type MessageDTO,
  type QuotationSummaryDTO,
} from '@holiday-vibez/shared';

const TEMPERATURE_OPTIONS = [LeadTemperature.HOT, LeadTemperature.WARM, LeadTemperature.COLD];
const TEMPERATURE_COLORS: Record<string, string> = {
  HOT: 'bg-red-100 text-red-700',
  WARM: 'bg-orange-100 text-orange-700',
  COLD: 'bg-emerald-100 text-emerald-700',
};
const TEMPERATURE_DOT_COLORS: Record<string, string> = {
  HOT: 'bg-red-500',
  WARM: 'bg-orange-500',
  COLD: 'bg-emerald-500',
};
const TEMPERATURE_DROPDOWN_OPTIONS: BadgeDropdownOption[] = TEMPERATURE_OPTIONS.map((t) => ({
  value: t,
  label: t.charAt(0) + t.slice(1).toLowerCase(),
  colorClass: TEMPERATURE_COLORS[t],
  dotClass: TEMPERATURE_DOT_COLORS[t],
}));
const MEAL_PREFERENCE_OPTIONS = ['Veg', 'Non-veg', 'Jain', 'Any'];

const STATUS_META: Record<LeadStatus, { label: string; icon: LucideIcon; color: string }> = {
  [LeadStatus.NEW]: { label: 'New', icon: Sparkles, color: 'bg-sky-500' },
  [LeadStatus.NO_CONNECT]: { label: 'No Connect', icon: PhoneOff, color: 'bg-slate-500' },
  [LeadStatus.PROPOSAL_SENT]: { label: 'Proposal Sent', icon: Send, color: 'bg-indigo-500' },
  [LeadStatus.HOT_LEAD]: { label: 'Hot Lead', icon: Flame, color: 'bg-red-500' },
  [LeadStatus.PROPOSAL_CONFIRMED]: { label: 'Proposal Confirmed', icon: FileCheck2, color: 'bg-teal-500' },
  [LeadStatus.FOLLOW_UP]: { label: 'Follow Up', icon: BellRing, color: 'bg-amber-500' },
  [LeadStatus.POSTPONED]: { label: 'Postponed', icon: PauseCircle, color: 'bg-purple-500' },
  [LeadStatus.CONFIRMED]: { label: 'Confirmed', icon: CheckCircle2, color: 'bg-emerald-500' },
  [LeadStatus.PLAN_DROPPED]: { label: 'Plan Dropped', icon: XCircle, color: 'bg-rose-500' },
  [LeadStatus.JUNK_NOT_INTERESTED]: { label: 'Junk / Not Interested', icon: Trash2, color: 'bg-zinc-500' },
};

const TABS = [
  { key: 'proposals', label: 'Proposals' },
  { key: 'whatsapp', label: 'WhatsApp' },
  { key: 'followups', label: "Followup's" },
  { key: 'mails', label: 'Mails' },
  { key: 'supp', label: 'Supp. Comm.' },
  { key: 'billing', label: 'Billing' },
  { key: 'history', label: 'History' },
] as const;
type TabKey = (typeof TABS)[number]['key'];

function formatLabel(s: string) {
  return s
    .toLowerCase()
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

interface TravelerRow {
  id: string;
  name: string;
  passportNumber: string | null;
  passportExpiry: string | null;
  visaStatus: string | null;
}

export default function LeadDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [lead, setLead] = useState<LeadSummaryDTO | null>(null);
  const [travelers, setTravelers] = useState<TravelerRow[]>([]);
  const [quotations, setQuotations] = useState<QuotationSummaryDTO[]>([]);
  const [bookings, setBookings] = useState<BookingDTO[]>([]);
  const [invoicesByBooking, setInvoicesByBooking] = useState<Record<string, InvoiceDTO[]>>({});
  const [itineraries, setItineraries] = useState<ItineraryPlanSummaryDTO[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', passportNumber: '', passportExpiry: '', visaStatus: '' });
  const [customFieldDefs, setCustomFieldDefs] = useState<CustomFieldDefinitionDTO[]>([]);
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, string>>({});
  const [travelForm, setTravelForm] = useState({
    travelDate: '',
    adultsCount: '',
    childrenCount: '',
    childrenAges: '',
    hotelCategory: '',
    mealPreference: '',
    transportRequired: false,
    visaRequired: false,
    flightRequired: false,
    insuranceRequired: false,
  });
  const [savingTravel, setSavingTravel] = useState(false);
  const [notes, setNotes] = useState<LeadNoteDTO[]>([]);
  const [reminders, setReminders] = useState<LeadReminderDTO[]>([]);
  const [noteDraft, setNoteDraft] = useState('');
  const [reminderDraft, setReminderDraft] = useState({ dueAt: '', note: '' });
  const [savingNote, setSavingNote] = useState(false);
  const [savingReminder, setSavingReminder] = useState(false);

  const [activeTab, setActiveTab] = useState<TabKey>('proposals');

  const [commDraft, setCommDraft] = useState({ channel: 'CALL' as 'CALL' | 'OTHER', body: '' });
  const [savingComm, setSavingComm] = useState(false);

  const [waConversation, setWaConversation] = useState<ConversationDTO | null>(null);
  const [waMessages, setWaMessages] = useState<MessageDTO[]>([]);
  const [waDraft, setWaDraft] = useState('');
  const [waLoading, setWaLoading] = useState(false);

  const [emailConversation, setEmailConversation] = useState<ConversationDTO | null>(null);
  const [emailMessages, setEmailMessages] = useState<MessageDTO[]>([]);
  const [emailDraft, setEmailDraft] = useState('');
  const [emailLoading, setEmailLoading] = useState(false);

  const [showAiModal, setShowAiModal] = useState(false);
  const [aiForm, setAiForm] = useState({ startDate: '', endDate: '', adultsCount: '1', childrenCount: '0', theme: '', freeText: '' });
  const [creatingItinerary, setCreatingItinerary] = useState(false);

  const [showInsertModal, setShowInsertModal] = useState(false);
  const [unlinkedItineraries, setUnlinkedItineraries] = useState<ItineraryPlanSummaryDTO[]>([]);
  const [insertingId, setInsertingId] = useState('');

  async function load() {
    try {
      const [leads, t, q, defs, values, leadNotes, leadReminders, allBookings, leadItineraries] = await Promise.all([
        api.get<LeadSummaryDTO[]>('/leads'),
        api.get<TravelerRow[]>(`/leads/${id}/travelers`),
        api.get<QuotationSummaryDTO[]>('/quotations'),
        api.get<CustomFieldDefinitionDTO[]>('/custom-fields/definitions?entityType=LEAD'),
        api.get<CustomFieldValueDTO[]>(`/custom-fields/values?entityType=LEAD&entityId=${id}`),
        api.get<LeadNoteDTO[]>(`/leads/${id}/notes`),
        api.get<LeadReminderDTO[]>(`/leads/${id}/reminders`),
        api.get<BookingDTO[]>('/bookings'),
        api.get<ItineraryPlanSummaryDTO[]>(`/itineraries?leadId=${id}`),
      ]);
      const found = leads.find((l) => l.id === id) ?? null;
      setLead(found);
      setTravelers(t);
      const leadQuotations = q.filter((qq) => qq.leadId === id);
      setQuotations(leadQuotations);
      const quotationIds = new Set(leadQuotations.map((qq) => qq.id));
      setBookings(allBookings.filter((b) => quotationIds.has(b.quotationId)));
      setCustomFieldDefs(defs.filter((d) => d.active));
      setCustomFieldValues(Object.fromEntries(values.map((v) => [v.definitionId, v.value])));
      setNotes(leadNotes);
      setReminders(leadReminders);
      setItineraries(leadItineraries);
      if (found) {
        setTravelForm({
          travelDate: found.travelDate ? found.travelDate.slice(0, 10) : '',
          adultsCount: found.adultsCount?.toString() ?? '',
          childrenCount: found.childrenCount?.toString() ?? '',
          childrenAges: found.childrenAges ?? '',
          hotelCategory: found.hotelCategory?.toString() ?? '',
          mealPreference: found.mealPreference ?? '',
          transportRequired: found.transportRequired,
          visaRequired: found.visaRequired,
          flightRequired: found.flightRequired,
          insuranceRequired: found.insuranceRequired,
        });
        setAiForm((f) => ({
          ...f,
          startDate: found.travelDate ? found.travelDate.slice(0, 10) : f.startDate,
          endDate: found.travelEndDate ? found.travelEndDate.slice(0, 10) : f.endDate,
          adultsCount: found.adultsCount?.toString() ?? f.adultsCount,
          childrenCount: found.childrenCount?.toString() ?? f.childrenCount,
        }));
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load lead');
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (activeTab === 'billing') {
      bookings.forEach((b) => {
        if (!invoicesByBooking[b.id]) {
          api
            .get<InvoiceDTO[]>(`/bookings/${b.id}/invoices`)
            .then((inv) => setInvoicesByBooking((prev) => ({ ...prev, [b.id]: inv })))
            .catch(() => {});
        }
      });
    }
    if (activeTab === 'whatsapp' && !waConversation) loadChannel('WHATSAPP');
    if (activeTab === 'mails' && !emailConversation) loadChannel('EMAIL');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, bookings]);

  async function loadChannel(channel: 'WHATSAPP' | 'EMAIL') {
    const setLoading = channel === 'WHATSAPP' ? setWaLoading : setEmailLoading;
    const setConversation = channel === 'WHATSAPP' ? setWaConversation : setEmailConversation;
    const setMessages = channel === 'WHATSAPP' ? setWaMessages : setEmailMessages;
    setLoading(true);
    try {
      const conversation = await api.post<ConversationDTO>(`/conversations/lead/${id}/ensure`, { channel });
      setConversation(conversation);
      const msgs = await api.get<MessageDTO[]>(`/conversations/${conversation.id}/messages`);
      setMessages(msgs);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : `Failed to load ${channel.toLowerCase()} thread`);
    } finally {
      setLoading(false);
    }
  }

  async function sendChannelMessage(channel: 'WHATSAPP' | 'EMAIL') {
    const conversation = channel === 'WHATSAPP' ? waConversation : emailConversation;
    const draft = channel === 'WHATSAPP' ? waDraft : emailDraft;
    if (!conversation || !draft.trim()) return;
    const setDraft = channel === 'WHATSAPP' ? setWaDraft : setEmailDraft;
    const setMessages = channel === 'WHATSAPP' ? setWaMessages : setEmailMessages;
    try {
      await api.post(`/conversations/${conversation.id}/messages`, { body: draft.trim() });
      setDraft('');
      const msgs = await api.get<MessageDTO[]>(`/conversations/${conversation.id}/messages`);
      setMessages(msgs);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to send message');
    }
  }

  async function handleSaveTravelRequirements(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSavingTravel(true);
    try {
      await api.patch(`/leads/${id}`, {
        travelDate: travelForm.travelDate || null,
        adultsCount: travelForm.adultsCount ? Number(travelForm.adultsCount) : null,
        childrenCount: travelForm.childrenCount ? Number(travelForm.childrenCount) : null,
        childrenAges: travelForm.childrenAges || null,
        hotelCategory: travelForm.hotelCategory ? Number(travelForm.hotelCategory) : null,
        mealPreference: travelForm.mealPreference || null,
        transportRequired: travelForm.transportRequired,
        visaRequired: travelForm.visaRequired,
        flightRequired: travelForm.flightRequired,
        insuranceRequired: travelForm.insuranceRequired,
      });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to save travel requirements');
    } finally {
      setSavingTravel(false);
    }
  }

  async function handleSaveCustomFields(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api.put('/custom-fields/values', {
        entityType: 'LEAD',
        entityId: id,
        values: customFieldDefs.map((d) => ({ definitionId: d.id, value: customFieldValues[d.id] ?? '' })),
      });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to save custom fields');
    }
  }

  async function handleAddTraveler(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api.post(`/leads/${id}/travelers`, {
        ...form,
        passportExpiry: form.passportExpiry || undefined,
      });
      setForm({ name: '', passportNumber: '', passportExpiry: '', visaStatus: '' });
      setShowForm(false);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to add traveler');
    }
  }

  async function handleTemperatureChange(temperature: string) {
    try {
      await api.patch(`/leads/${id}`, { temperature });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to update lead');
    }
  }

  async function handleStatusChange(status: LeadStatus) {
    try {
      await api.patch(`/leads/${id}`, { status });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to update status');
    }
  }

  async function handleAddNote(e: FormEvent) {
    e.preventDefault();
    if (!noteDraft.trim()) return;
    setSavingNote(true);
    setError(null);
    try {
      await api.post(`/leads/${id}/notes`, { body: noteDraft.trim(), channel: 'GENERAL' });
      setNoteDraft('');
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to add note');
    } finally {
      setSavingNote(false);
    }
  }

  async function handleAddCommLog(e: FormEvent) {
    e.preventDefault();
    if (!commDraft.body.trim()) return;
    setSavingComm(true);
    setError(null);
    try {
      await api.post(`/leads/${id}/notes`, { body: commDraft.body.trim(), channel: commDraft.channel });
      setCommDraft({ ...commDraft, body: '' });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to log communication');
    } finally {
      setSavingComm(false);
    }
  }

  async function handleAddReminder(e: FormEvent) {
    e.preventDefault();
    if (!reminderDraft.dueAt || !reminderDraft.note.trim()) return;
    setSavingReminder(true);
    setError(null);
    try {
      await api.post(`/leads/${id}/reminders`, { dueAt: new Date(reminderDraft.dueAt).toISOString(), note: reminderDraft.note.trim() });
      setReminderDraft({ dueAt: '', note: '' });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to add reminder');
    } finally {
      setSavingReminder(false);
    }
  }

  async function handleCompleteReminder(reminderId: string) {
    try {
      await api.patch(`/leads/${id}/reminders/${reminderId}/complete`, {});
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to complete reminder');
    }
  }

  async function handleCreateQuotation() {
    try {
      const q = await api.post<QuotationSummaryDTO>('/quotations', { leadId: id });
      router.push(`/quotations/${q.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to create quotation');
    }
  }

  async function handleCreateItinerary() {
    if (!lead) return;
    setCreatingItinerary(true);
    setError(null);
    try {
      const plan = await api.post<ItineraryPlanSummaryDTO>('/itineraries', {
        title: `${lead.destination} — ${lead.clientName}`,
        leadId: id,
        destinations: [lead.destination],
        startDate: lead.travelDate ?? undefined,
        endDate: lead.travelEndDate ?? undefined,
        adultsCount: lead.adultsCount ?? 1,
        childrenCount: lead.childrenCount ?? 0,
        infantsCount: lead.infantsCount ?? 0,
      });
      router.push(`/itineraries/${plan.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to create itinerary');
      setCreatingItinerary(false);
    }
  }

  async function handleSubmitAi(e: FormEvent) {
    e.preventDefault();
    if (!lead) return;
    setCreatingItinerary(true);
    setError(null);
    try {
      const plan = await api.post<{ id: string }>('/itineraries/generate-ai', {
        destinations: [lead.destination],
        startDate: aiForm.startDate,
        endDate: aiForm.endDate,
        adultsCount: aiForm.adultsCount ? Number(aiForm.adultsCount) : undefined,
        childrenCount: aiForm.childrenCount ? Number(aiForm.childrenCount) : undefined,
        theme: aiForm.theme || undefined,
        freeText: aiForm.freeText || undefined,
      });
      await api.patch(`/itineraries/${plan.id}`, { leadId: id });
      router.push(`/itineraries/${plan.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to generate itinerary via AI');
      setCreatingItinerary(false);
    }
  }

  async function handleOpenInsertModal() {
    setShowInsertModal(true);
    try {
      const all = await api.get<ItineraryPlanSummaryDTO[]>('/itineraries');
      setUnlinkedItineraries(all.filter((p) => !p.leadId));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load itineraries');
    }
  }

  async function handleInsertItinerary() {
    if (!insertingId) return;
    try {
      await api.patch(`/itineraries/${insertingId}`, { leadId: id });
      setShowInsertModal(false);
      setInsertingId('');
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to link itinerary');
    }
  }

  const generalNotes = useMemo(() => notes.filter((n) => n.channel === 'GENERAL'), [notes]);
  const suppNotes = useMemo(() => notes.filter((n) => n.channel !== 'GENERAL'), [notes]);
  const nextReminder = useMemo(
    () => reminders.filter((r) => !r.completedAt).sort((a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime())[0],
    [reminders],
  );

  const historyRows = useMemo(() => {
    const rows: { date: string; icon: LucideIcon; label: string; detail: string }[] = [];
    notes.forEach((n) => rows.push({ date: n.createdAt, icon: StickyNote, label: n.channel === 'GENERAL' ? 'Note added' : `${formatLabel(n.channel)} logged`, detail: `${n.body} — ${n.authorName}` }));
    reminders.forEach((r) => rows.push({ date: r.dueAt, icon: BellRing, label: r.completedAt ? 'Reminder completed' : 'Reminder set', detail: `${r.note} — ${r.assignedToName}` }));
    quotations.forEach((q) => rows.push({ date: (q as unknown as { createdAt?: string }).createdAt ?? new Date().toISOString(), icon: Receipt, label: 'Quotation created', detail: `${q.refNo} · ${q.status}` }));
    itineraries.forEach((p) => rows.push({ date: p.updatedAt, icon: FolderInput, label: 'Itinerary linked', detail: `${p.refNo} · ${p.title}` }));
    return rows.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [notes, reminders, quotations, itineraries]);

  if (!lead) {
    return (
      <AppShell>
        <p className="text-sm text-slate-500">{error ?? 'Loading...'}</p>
      </AppShell>
    );
  }

  const currentStatusMeta = STATUS_META[lead.status];

  return (
    <AppShell>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
          <button onClick={() => router.push('/leads')} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-xl font-extrabold tracking-tight text-brand-700">{lead.clientName}</h1>
          <BadgeDropdown value={lead.temperature} options={TEMPERATURE_DROPDOWN_OPTIONS} onChange={handleTemperatureChange} />
          {lead.assignedConsultantName && (
            <span className="flex items-center gap-1 text-xs text-slate-500">
              <Crown className="h-3.5 w-3.5 text-amber-500" /> {lead.assignedConsultantName}
            </span>
          )}
          {nextReminder && (
            <span className="flex items-center gap-1 text-xs text-slate-500">
              <CalendarClock className="h-3.5 w-3.5" /> {new Date(nextReminder.dueAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
            </span>
          )}
          <span className="flex items-center gap-1 text-xs text-slate-400">
            <Clock className="h-3.5 w-3.5" /> {formatDateTime(lead.createdAt)}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <button onClick={() => setActiveTab('followups')} title="Followup's" className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800">
            <CalendarClock className="h-4 w-4" />
          </button>
          <button onClick={() => setActiveTab('mails')} title="Mails" className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800">
            <Mail className="h-4 w-4" />
          </button>
          <button onClick={() => setActiveTab('whatsapp')} title="WhatsApp" className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800">
            <MessageCircle className="h-4 w-4" />
          </button>
        </div>
      </div>
      <p className="mt-1 text-sm text-slate-500">{lead.destination} · {lead.phone}</p>

      <div className="mt-4 flex flex-wrap gap-2">
        {Object.values(LeadStatus).map((status) => {
          const meta = STATUS_META[status];
          const Icon = meta.icon;
          const active = status === lead.status;
          return (
            <button
              key={status}
              onClick={() => handleStatusChange(status)}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition ${active ? `${meta.color} text-white shadow-md` : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'}`}
            >
              <Icon className="h-3.5 w-3.5" /> {meta.label}
            </button>
          );
        })}
      </div>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[380px_1fr]">
        {/* Left column */}
        <div className="space-y-6">
          <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800 shadow-card p-4">
            <h2 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">Query Information</h2>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between gap-3"><dt className="text-slate-500">Destination</dt><dd className="font-medium text-slate-700 dark:text-slate-200">{lead.destination}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-slate-500">From Date</dt><dd className="font-medium text-slate-700 dark:text-slate-200">{lead.travelDate ? new Date(lead.travelDate).toLocaleDateString('en-IN') : '—'}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-slate-500">To Date</dt><dd className="font-medium text-slate-700 dark:text-slate-200">{lead.travelEndDate ? new Date(lead.travelEndDate).toLocaleDateString('en-IN') : '—'}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-slate-500">Travel Month</dt><dd className="font-medium text-slate-700 dark:text-slate-200">{lead.travelDate ? new Date(lead.travelDate).toLocaleDateString('en-IN', { month: 'long' }) : '—'}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-slate-500">Lead Source</dt><dd className="font-medium text-slate-700 dark:text-slate-200">{formatLabel(lead.source)}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-slate-500">Service</dt><dd className="font-medium text-slate-700 dark:text-slate-200">{lead.service ? `${formatLabel(lead.service)} only` : '—'}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-slate-500">Pax</dt><dd className="font-medium text-slate-700 dark:text-slate-200">Adult: {lead.adultsCount ?? 0} - Child: {lead.childrenCount ?? 0} - Infant: {lead.infantsCount ?? 0}</dd></div>
            </dl>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800 shadow-card p-4">
            <h2 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">Related Customer</h2>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between gap-3"><dt className="text-slate-500">Name</dt><dd className="font-medium text-slate-700 dark:text-slate-200">{lead.title ? `${lead.title} ` : ''}{lead.clientName}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-slate-500">Phone</dt><dd className="font-medium text-slate-700 dark:text-slate-200">{lead.phone}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-slate-500">Email</dt><dd className="font-medium text-slate-700 dark:text-slate-200">{lead.email ?? '—'}</dd></div>
            </dl>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800 shadow-card p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Notes</h2>
            </div>
            <form onSubmit={handleAddNote} className="mt-2 flex items-end gap-2">
              <textarea
                rows={2}
                placeholder="Log a call, message, or update…"
                value={noteDraft}
                onChange={(e) => setNoteDraft(e.target.value)}
                className="flex-1 resize-none rounded-lg border border-slate-300 px-2 py-1.5 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-100 dark:border-slate-600 dark:bg-slate-900"
              />
              <button type="submit" disabled={savingNote} className="rounded-lg bg-gradient-to-br from-brand-600 to-brand-500 px-3 py-1.5 text-sm font-medium text-white shadow-md shadow-brand-500/25 hover:opacity-90 disabled:opacity-50">
                {savingNote ? 'Adding…' : 'Add'}
              </button>
            </form>
            <ul className="mt-3 space-y-2">
              {generalNotes.map((n) => (
                <li key={n.id} className="rounded-lg border border-amber-100 bg-amber-50 p-3 dark:border-amber-900/40 dark:bg-amber-950/20">
                  <p className="text-sm text-slate-700 dark:text-slate-200">{n.body}</p>
                  <p className="mt-0.5 text-xs text-slate-400">{n.authorName} · {formatDateTime(n.createdAt)}</p>
                </li>
              ))}
              {generalNotes.length === 0 && <li className="text-xs text-slate-400">No notes yet.</li>}
            </ul>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800 shadow-card p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Travelers</h2>
              <button onClick={() => setShowForm((s) => !s)} className="text-sm text-brand hover:underline">
                {showForm ? 'Cancel' : '+ Add traveler'}
              </button>
            </div>
            {showForm && (
              <form onSubmit={handleAddTraveler} className="mt-2 grid grid-cols-1 gap-2 rounded-xl border border-slate-200 bg-white dark:bg-slate-900 p-3">
                <input required placeholder="Full name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-100 dark:border-slate-600 dark:bg-slate-900" />
                <input placeholder="Passport number" value={form.passportNumber} onChange={(e) => setForm({ ...form, passportNumber: e.target.value })} className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-100 dark:border-slate-600 dark:bg-slate-900" />
                <input type="date" placeholder="Passport expiry" value={form.passportExpiry} onChange={(e) => setForm({ ...form, passportExpiry: e.target.value })} className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-100 dark:border-slate-600 dark:bg-slate-900" />
                <input placeholder="Visa status" value={form.visaStatus} onChange={(e) => setForm({ ...form, visaStatus: e.target.value })} className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-100 dark:border-slate-600 dark:bg-slate-900" />
                <button type="submit" className="rounded-xl bg-gradient-to-br from-brand-600 to-brand-500 shadow-md shadow-brand-500/25 px-3 py-2 text-sm font-medium text-white hover:opacity-90">Save traveler</button>
              </form>
            )}
            <div className="mt-2 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-brand-50/60 text-left text-xs font-semibold uppercase tracking-wide text-brand-700 dark:bg-slate-900/40 dark:text-brand-300">
                  <tr><th className="px-3 py-2">Name</th><th className="px-3 py-2">Passport</th></tr>
                </thead>
                <tbody>
                  {travelers.map((t) => (
                    <tr key={t.id} className="border-t border-slate-100 dark:border-slate-700">
                      <td className="px-3 py-2">{t.name}</td>
                      <td className="px-3 py-2 text-slate-500">{t.passportNumber ?? '—'}</td>
                    </tr>
                  ))}
                  {travelers.length === 0 && <tr><td colSpan={2} className="px-3 py-4 text-center text-slate-400">No travelers added yet.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right column — tabbed hub */}
        <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800 shadow-card">
          <div className="flex flex-wrap gap-1 border-b border-slate-200 px-3 pt-2 dark:border-slate-700">
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                className={`rounded-t-lg px-3 py-2 text-sm font-medium transition ${activeTab === t.key ? 'border-b-2 border-brand text-brand' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="p-4">
            {activeTab === 'proposals' && (
              <div>
                <div className="mb-3 flex flex-wrap gap-2">
                  <button onClick={handleCreateItinerary} disabled={creatingItinerary} className="flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700">
                    <Plus className="h-4 w-4" /> Create itinerary
                  </button>
                  <button onClick={handleOpenInsertModal} className="flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700">
                    <FolderInput className="h-4 w-4" /> Insert itinerary
                  </button>
                  <button onClick={() => setShowAiModal(true)} className="flex items-center gap-1.5 rounded-lg bg-gradient-to-br from-teal-500 to-teal-600 px-3 py-2 text-sm font-semibold text-white shadow-md hover:opacity-90">
                    <Wand2 className="h-4 w-4" /> Create via AI
                  </button>
                </div>
                <ul className="space-y-2">
                  {itineraries.map((p) => (
                    <li key={p.id} className="flex items-center justify-between rounded-lg border border-slate-200 p-3 text-sm dark:border-slate-700">
                      <div>
                        <p className="font-medium text-slate-700 dark:text-slate-200">{p.title}</p>
                        <p className="text-xs text-slate-400">{p.refNo} · {p.duration ?? '—'} · {p.status}</p>
                      </div>
                      <a href={`/itineraries/${p.id}`} className="text-brand hover:underline">Open</a>
                    </li>
                  ))}
                  {itineraries.length === 0 && <li className="text-sm text-slate-400">No itineraries yet.</li>}
                </ul>
              </div>
            )}

            {activeTab === 'whatsapp' && (
              <ChannelPanel
                loading={waLoading}
                conversation={waConversation}
                messages={waMessages}
                draft={waDraft}
                setDraft={setWaDraft}
                onSend={() => sendChannelMessage('WHATSAPP')}
              />
            )}

            {activeTab === 'followups' && (
              <div>
                <form onSubmit={handleAddReminder} className="flex flex-wrap items-end gap-2 rounded-xl border border-slate-200 p-3 dark:border-slate-700">
                  <div className="flex-1 min-w-[140px]">
                    <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">Due</label>
                    <input
                      type="datetime-local"
                      value={reminderDraft.dueAt}
                      onChange={(e) => setReminderDraft({ ...reminderDraft, dueAt: e.target.value })}
                      className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-100 dark:border-slate-600 dark:bg-slate-900"
                    />
                  </div>
                  <div className="flex-[2] min-w-[160px]">
                    <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">Follow up on…</label>
                    <input
                      placeholder="Follow up on quote, check documents…"
                      value={reminderDraft.note}
                      onChange={(e) => setReminderDraft({ ...reminderDraft, note: e.target.value })}
                      className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-100 dark:border-slate-600 dark:bg-slate-900"
                    />
                  </div>
                  <button type="submit" disabled={savingReminder} className="rounded-lg bg-gradient-to-br from-brand-600 to-brand-500 px-3 py-1.5 text-sm font-medium text-white shadow-md shadow-brand-500/25 hover:opacity-90 disabled:opacity-50">
                    {savingReminder ? 'Adding…' : 'Add'}
                  </button>
                </form>
                <ul className="mt-3 space-y-2">
                  {reminders.map((r) => {
                    const overdue = !r.completedAt && new Date(r.dueAt) < new Date();
                    return (
                      <li key={r.id} className={`flex items-start justify-between gap-2 rounded-xl border p-3 ${r.completedAt ? 'border-slate-100 bg-slate-50 dark:bg-slate-900/50' : overdue ? 'border-rose-200 bg-rose-50 dark:border-rose-900 dark:bg-rose-950/30' : 'border-slate-200 dark:border-slate-700'}`}>
                        <div>
                          <p className={`text-sm ${r.completedAt ? 'text-slate-400 line-through' : 'text-slate-700 dark:text-slate-200'}`}>{r.note}</p>
                          <p className="mt-0.5 text-xs text-slate-400">
                            {formatDateTime(r.dueAt)} · {r.assignedToName}
                            {overdue && !r.completedAt && <span className="ml-2 rounded-full bg-rose-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-rose-700 dark:bg-rose-900 dark:text-rose-300">Overdue</span>}
                          </p>
                        </div>
                        {!r.completedAt && (
                          <button onClick={() => handleCompleteReminder(r.id)} className="shrink-0 text-xs font-medium text-brand hover:underline">Done</button>
                        )}
                      </li>
                    );
                  })}
                  {reminders.length === 0 && <li className="text-xs text-slate-400">No reminders yet.</li>}
                </ul>
              </div>
            )}

            {activeTab === 'mails' && (
              <ChannelPanel
                loading={emailLoading}
                conversation={emailConversation}
                messages={emailMessages}
                draft={emailDraft}
                setDraft={setEmailDraft}
                onSend={() => sendChannelMessage('EMAIL')}
              />
            )}

            {activeTab === 'supp' && (
              <div>
                <form onSubmit={handleAddCommLog} className="flex flex-wrap items-end gap-2 rounded-xl border border-slate-200 p-3 dark:border-slate-700">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">Channel</label>
                    <select value={commDraft.channel} onChange={(e) => setCommDraft({ ...commDraft, channel: e.target.value as 'CALL' | 'OTHER' })} className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm focus:border-brand focus:outline-none dark:border-slate-600 dark:bg-slate-900">
                      <option value="CALL">Call</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>
                  <div className="flex-1 min-w-[200px]">
                    <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">Details</label>
                    <input
                      placeholder="Spoke with client about hotel upgrade…"
                      value={commDraft.body}
                      onChange={(e) => setCommDraft({ ...commDraft, body: e.target.value })}
                      className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-100 dark:border-slate-600 dark:bg-slate-900"
                    />
                  </div>
                  <button type="submit" disabled={savingComm} className="rounded-lg bg-gradient-to-br from-brand-600 to-brand-500 px-3 py-1.5 text-sm font-medium text-white shadow-md shadow-brand-500/25 hover:opacity-90 disabled:opacity-50">
                    {savingComm ? 'Logging…' : 'Log'}
                  </button>
                </form>
                <ul className="mt-3 space-y-2">
                  {suppNotes.map((n) => (
                    <li key={n.id} className="flex items-start gap-2 rounded-lg border border-slate-200 p-3 text-sm dark:border-slate-700">
                      <Phone className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                      <div>
                        <p className="text-slate-700 dark:text-slate-200">{n.body}</p>
                        <p className="mt-0.5 text-xs text-slate-400">{formatLabel(n.channel)} · {n.authorName} · {formatDateTime(n.createdAt)}</p>
                      </div>
                    </li>
                  ))}
                  {suppNotes.length === 0 && <li className="text-xs text-slate-400">No supplementary communication logged yet.</li>}
                </ul>
              </div>
            )}

            {activeTab === 'billing' && (
              <div className="space-y-6">
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Quotations</h3>
                    <button onClick={handleCreateQuotation} className="rounded-lg bg-gradient-to-br from-brand-600 to-brand-500 px-3 py-1.5 text-xs font-semibold text-white shadow-md shadow-brand-500/25 hover:opacity-90">
                      + New Quotation
                    </button>
                  </div>
                  <table className="w-full text-sm">
                    <thead className="bg-brand-50/60 text-left text-xs font-semibold uppercase tracking-wide text-brand-700 dark:bg-slate-900/40 dark:text-brand-300">
                      <tr><th className="px-3 py-2">Ref</th><th className="px-3 py-2">Status</th><th className="px-3 py-2">Total</th><th></th></tr>
                    </thead>
                    <tbody>
                      {quotations.map((q) => (
                        <tr key={q.id} className="border-t border-slate-100 dark:border-slate-700">
                          <td className="px-3 py-2">{q.refNo}</td>
                          <td className="px-3 py-2">{q.status}</td>
                          <td className="px-3 py-2">₹{Number(q.totalAmount).toLocaleString('en-IN')}</td>
                          <td className="px-3 py-2 text-right"><a href={`/quotations/${q.id}`} className="text-brand hover:underline">Open</a></td>
                        </tr>
                      ))}
                      {quotations.length === 0 && <tr><td colSpan={4} className="px-3 py-4 text-center text-slate-400">No quotations yet.</td></tr>}
                    </tbody>
                  </table>
                </div>

                <div>
                  <h3 className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-200">Bookings & Payments</h3>
                  {bookings.length === 0 && <p className="text-sm text-slate-400">No bookings yet.</p>}
                  <div className="space-y-3">
                    {bookings.map((b) => (
                      <div key={b.id} className="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium text-slate-700 dark:text-slate-200">Booking · {b.status}</span>
                          <span className="text-xs text-slate-400">Departure {new Date(b.departureDate).toLocaleDateString('en-IN')}</span>
                        </div>
                        <table className="mt-2 w-full text-xs">
                          <thead className="text-left text-slate-400">
                            <tr><th className="py-1">Type</th><th className="py-1">Amount</th><th className="py-1">Status</th></tr>
                          </thead>
                          <tbody>
                            {(b.payments ?? []).map((p) => (
                              <tr key={p.id} className="border-t border-slate-100 dark:border-slate-700">
                                <td className="py-1">{formatLabel(p.type)}</td>
                                <td className="py-1">₹{Number(p.amount).toLocaleString('en-IN')}</td>
                                <td className="py-1">{p.paidAt ? 'Paid' : 'Pending'}</td>
                              </tr>
                            ))}
                            {(b.payments ?? []).length === 0 && <tr><td colSpan={3} className="py-1 text-slate-400">No payments recorded.</td></tr>}
                          </tbody>
                        </table>
                        {(invoicesByBooking[b.id] ?? []).length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-2">
                            {invoicesByBooking[b.id].map((inv) => (
                              <a key={inv.id} href={inv.pdfUrl ?? '#'} target="_blank" rel="noreferrer" className="flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-600 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300">
                                <Receipt className="h-3 w-3" /> {inv.invoiceNo}
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'history' && (
              <ul className="space-y-3">
                {historyRows.map((row, idx) => {
                  const Icon = row.icon;
                  return (
                    <li key={idx} className="flex gap-3">
                      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand dark:bg-slate-700">
                        <Icon className="h-3.5 w-3.5" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{row.label}</p>
                        <p className="text-xs text-slate-400">{row.detail}</p>
                        <p className="text-[11px] text-slate-300">{formatDateTime(row.date)}</p>
                      </div>
                    </li>
                  );
                })}
                {historyRows.length === 0 && <li className="text-sm text-slate-400 flex items-center gap-2"><HistoryIcon className="h-4 w-4" /> No activity yet.</li>}
              </ul>
            )}
          </div>
        </div>
      </div>

      <div className="mt-6">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Travel Requirement</h2>
        <form onSubmit={handleSaveTravelRequirements} className="mt-2 grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-white dark:bg-slate-800 shadow-card transition-shadow hover:shadow-card-hover p-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">Travel date</label>
            <input type="date" value={travelForm.travelDate} onChange={(e) => setTravelForm({ ...travelForm, travelDate: e.target.value })} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-100 transition-colors dark:border-slate-600 dark:bg-slate-900" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">No. of adults</label>
            <input type="number" min={0} value={travelForm.adultsCount} onChange={(e) => setTravelForm({ ...travelForm, adultsCount: e.target.value })} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-100 transition-colors dark:border-slate-600 dark:bg-slate-900" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">No. of children</label>
            <input type="number" min={0} value={travelForm.childrenCount} onChange={(e) => setTravelForm({ ...travelForm, childrenCount: e.target.value })} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-100 transition-colors dark:border-slate-600 dark:bg-slate-900" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">Children ages</label>
            <input placeholder="e.g. 5, 8" value={travelForm.childrenAges} onChange={(e) => setTravelForm({ ...travelForm, childrenAges: e.target.value })} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-100 transition-colors dark:border-slate-600 dark:bg-slate-900" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">Hotel category</label>
            <select value={travelForm.hotelCategory} onChange={(e) => setTravelForm({ ...travelForm, hotelCategory: e.target.value })} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-100 transition-colors dark:border-slate-600 dark:bg-slate-900">
              <option value="">Not set</option>
              {[3, 4, 5].map((n) => <option key={n} value={n}>{n}-star</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">Meal preference</label>
            <select value={travelForm.mealPreference} onChange={(e) => setTravelForm({ ...travelForm, mealPreference: e.target.value })} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-100 transition-colors dark:border-slate-600 dark:bg-slate-900">
              <option value="">Not set</option>
              {MEAL_PREFERENCE_OPTIONS.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div className="flex flex-wrap items-center gap-4 sm:col-span-2 lg:col-span-3 text-sm text-slate-600 dark:text-slate-300">
            <label className="flex items-center gap-1.5">
              <input type="checkbox" checked={travelForm.transportRequired} onChange={(e) => setTravelForm({ ...travelForm, transportRequired: e.target.checked })} /> Transport
            </label>
            <label className="flex items-center gap-1.5">
              <input type="checkbox" checked={travelForm.visaRequired} onChange={(e) => setTravelForm({ ...travelForm, visaRequired: e.target.checked })} /> Visa
            </label>
            <label className="flex items-center gap-1.5">
              <input type="checkbox" checked={travelForm.flightRequired} onChange={(e) => setTravelForm({ ...travelForm, flightRequired: e.target.checked })} /> Flight
            </label>
            <label className="flex items-center gap-1.5">
              <input type="checkbox" checked={travelForm.insuranceRequired} onChange={(e) => setTravelForm({ ...travelForm, insuranceRequired: e.target.checked })} /> Insurance
            </label>
          </div>
          <button type="submit" disabled={savingTravel} className="rounded-xl bg-gradient-to-br from-brand-600 to-brand-500 shadow-md shadow-brand-500/25 px-3 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 sm:col-span-2 lg:col-span-3">
            {savingTravel ? 'Saving…' : 'Save travel requirement'}
          </button>
        </form>
      </div>

      {customFieldDefs.length > 0 && (
        <div className="mt-6">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Custom Fields</h2>
          <form onSubmit={handleSaveCustomFields} className="mt-2 grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-white dark:bg-slate-800 shadow-card transition-shadow hover:shadow-card-hover p-4 sm:grid-cols-2 lg:grid-cols-3">
            {customFieldDefs.map((d) => (
              <div key={d.id}>
                <label className="mb-1 block text-xs font-medium text-slate-600">
                  {d.label}{d.required ? ' *' : ''}
                </label>
                {d.fieldType === CustomFieldType.BOOLEAN ? (
                  <input
                    type="checkbox"
                    checked={customFieldValues[d.id] === 'true'}
                    onChange={(e) => setCustomFieldValues({ ...customFieldValues, [d.id]: e.target.checked ? 'true' : 'false' })}
                  />
                ) : d.fieldType === CustomFieldType.SELECT ? (
                  <select
                    required={d.required}
                    value={customFieldValues[d.id] ?? ''}
                    onChange={(e) => setCustomFieldValues({ ...customFieldValues, [d.id]: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-100 transition-colors"
                  >
                    <option value="">Select...</option>
                    {d.options.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                ) : (
                  <input
                    required={d.required}
                    type={d.fieldType === CustomFieldType.NUMBER ? 'number' : d.fieldType === CustomFieldType.DATE ? 'date' : 'text'}
                    value={customFieldValues[d.id] ?? ''}
                    onChange={(e) => setCustomFieldValues({ ...customFieldValues, [d.id]: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-100 transition-colors"
                  />
                )}
              </div>
            ))}
            <button type="submit" className="rounded-xl bg-gradient-to-br from-brand-600 to-brand-500 shadow-md shadow-brand-500/25 px-3 py-2 text-sm font-medium text-white hover:opacity-90 sm:col-span-2 lg:col-span-3">
              Save custom fields
            </button>
          </form>
        </div>
      )}

      {showAiModal && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40" onClick={() => setShowAiModal(false)}>
          <form onSubmit={handleSubmitAi} onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-xl bg-white p-5 shadow-2xl dark:bg-slate-800">
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">Create Itinerary via AI</h2>
            <p className="mt-1 text-xs text-slate-500">Destination is taken from this lead ({lead.destination}). Fill in the trip window and any notes for the AI draft.</p>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">From Date *</label>
                <input required type="date" value={aiForm.startDate} onChange={(e) => setAiForm({ ...aiForm, startDate: e.target.value })} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">To Date *</label>
                <input required type="date" min={aiForm.startDate} value={aiForm.endDate} onChange={(e) => setAiForm({ ...aiForm, endDate: e.target.value })} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Adults</label>
                <input type="number" min={1} value={aiForm.adultsCount} onChange={(e) => setAiForm({ ...aiForm, adultsCount: e.target.value })} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Children</label>
                <input type="number" min={0} value={aiForm.childrenCount} onChange={(e) => setAiForm({ ...aiForm, childrenCount: e.target.value })} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900" />
              </div>
              <div className="col-span-2">
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Theme</label>
                <input placeholder="Honeymoon, Family, Adventure…" value={aiForm.theme} onChange={(e) => setAiForm({ ...aiForm, theme: e.target.value })} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900" />
              </div>
              <div className="col-span-2">
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Notes for AI</label>
                <textarea rows={3} value={aiForm.freeText} onChange={(e) => setAiForm({ ...aiForm, freeText: e.target.value })} className="w-full resize-none rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900" />
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => setShowAiModal(false)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300">Cancel</button>
              <button type="submit" disabled={creatingItinerary} className="rounded-lg bg-gradient-to-br from-teal-500 to-teal-600 px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50">
                {creatingItinerary ? 'Generating…' : 'Generate'}
              </button>
            </div>
          </form>
        </div>
      )}

      {showInsertModal && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40" onClick={() => setShowInsertModal(false)}>
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-xl bg-white p-5 shadow-2xl dark:bg-slate-800">
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">Insert Itinerary</h2>
            <p className="mt-1 text-xs text-slate-500">Link an existing, unlinked itinerary to this lead.</p>
            <select value={insertingId} onChange={(e) => setInsertingId(e.target.value)} className="mt-3 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900">
              <option value="">Select an itinerary…</option>
              {unlinkedItineraries.map((p) => (
                <option key={p.id} value={p.id}>{p.refNo} · {p.title}</option>
              ))}
            </select>
            {unlinkedItineraries.length === 0 && <p className="mt-2 text-xs text-slate-400">No unlinked itineraries available.</p>}
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setShowInsertModal(false)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300">Cancel</button>
              <button onClick={handleInsertItinerary} disabled={!insertingId} className="rounded-lg bg-gradient-to-br from-brand-600 to-brand-500 px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50">Link</button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}

function ChannelPanel({
  loading,
  conversation,
  messages,
  draft,
  setDraft,
  onSend,
}: {
  loading: boolean;
  conversation: ConversationDTO | null;
  messages: MessageDTO[];
  draft: string;
  setDraft: (v: string) => void;
  onSend: () => void;
}) {
  if (loading) return <p className="text-sm text-slate-400">Loading…</p>;
  if (!conversation) return <p className="text-sm text-slate-400">No conversation yet.</p>;
  return (
    <div>
      <div className="max-h-80 space-y-2 overflow-y-auto rounded-lg border border-slate-200 p-3 dark:border-slate-700">
        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.direction === 'OUTBOUND' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[75%] rounded-lg px-3 py-2 text-sm ${m.direction === 'OUTBOUND' ? 'bg-brand text-white' : 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200'}`}>
              <p>{m.body}</p>
              <p className={`mt-0.5 text-[10px] ${m.direction === 'OUTBOUND' ? 'text-brand-100' : 'text-slate-400'}`}>{formatDateTime(m.createdAt)}</p>
            </div>
          </div>
        ))}
        {messages.length === 0 && <p className="text-center text-sm text-slate-400">No messages yet.</p>}
      </div>
      <div className="mt-2 flex gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); onSend(); } }}
          placeholder="Type a message…"
          className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-100 dark:border-slate-600 dark:bg-slate-900"
        />
        <button onClick={onSend} className="rounded-lg bg-gradient-to-br from-brand-600 to-brand-500 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-brand-500/25 hover:opacity-90">Send</button>
      </div>
    </div>
  );
}
