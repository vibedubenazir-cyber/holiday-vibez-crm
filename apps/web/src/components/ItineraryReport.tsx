import type { ReactNode } from 'react';
import { absoluteUploadUrl } from '@/lib/upload';
import { ContactFooter } from './ContactFooter';

// Only the type-specific field the client report surfaces. The full shape
// lives in ItineraryEventDetails (shared) — this component deliberately reads
// just what it renders so the public API payload satisfies it structurally.
export interface ItineraryReportDetails {
  hotelCategory?: number | null;
  roomName?: string | null;
  mealPlan?: string | null;
  single?: number | null;
  double?: number | null;
  triple?: number | null;
  quad?: number | null;
  cwb?: number | null;
  cnb?: number | null;
  descriptionBullets?: boolean | null;
}

export interface ItineraryReportEvent {
  id: string;
  type: string;
  name: string;
  destination: string | null;
  date: string | null;
  description: string | null;
  photoUrl: string | null;
  details?: ItineraryReportDetails | null;
}

export interface ItineraryReportDay {
  id: string;
  dayNumber: number;
  date: string | null;
  events: ItineraryReportEvent[];
}

export interface ItineraryReportOption {
  id: string;
  label: string;
  totalIncludingGst: number;
  accommodations: {
    id: string;
    name: string;
    destination?: string | null;
    date?: string | null;
    endDate?: string | null;
    photoUrl?: string | null;
    description: string | null;
    details?: ItineraryReportDetails | null;
  }[];
}

export interface ItineraryReportConsultant {
  name: string;
  phone?: string | null;
  email?: string | null;
}

export interface ItineraryReportData {
  refNo: string;
  title: string;
  destinations: string[];
  startDate: string | null;
  endDate: string | null;
  adultsCount: number;
  childrenCount: number;
  infantsCount: number;
  coverPhotoUrl: string | null;
  days: ItineraryReportDay[];
  images: { id: string; url: string; caption: string | null }[];
  packageTerms: {
    bookingAndPayment: string | null;
    pricingAndInclusions: string | null;
    cancellationsAndRefunds: string | null;
    liability: string | null;
  } | null;
  pricingOptions: ItineraryReportOption[];
  consultant?: ItineraryReportConsultant | null;
}

function formatDate(value: string | null) {
  if (!value) return '';
  return new Date(value).toLocaleDateString('en-IN', { weekday: 'long', day: '2-digit', month: 'short', year: 'numeric' });
}

// Hotel star rating, shown beside the property name exactly as the reference
// client report does. Renders nothing when the consultant didn't set a
// category, rather than showing zero stars.
function StarRating({ details }: { details?: ItineraryReportDetails | null }) {
  const stars = Number(details?.hotelCategory ?? 0);
  if (!stars || stars < 1) return null;
  return (
    <span className="ml-1 whitespace-nowrap text-amber-500" title={`${stars} star`} aria-label={`${stars} star`}>
      {'★'.repeat(Math.min(5, Math.round(stars)))}
    </span>
  );
}

// "1 Double, 1 Twin" style summary of the room-count fields captured on an
// Accommodation event — the same fields the Build tab's SINGLE/DOUBLE/TRIPLE/
// QUAD/CWB/CNB inputs feed, condensed to what a client actually needs to see.
const ROOM_LABELS: [keyof ItineraryReportDetails, string][] = [
  ['single', 'Single'],
  ['double', 'Double'],
  ['triple', 'Triple'],
  ['quad', 'Quad'],
  ['cwb', 'Child w/ Bed'],
  ['cnb', 'Child no Bed'],
];
function roomSummary(details?: ItineraryReportDetails | null): string | null {
  if (!details) return null;
  const parts = ROOM_LABELS.map(([key, label]) => {
    const n = Number(details[key] ?? 0);
    return n > 0 ? `${n} ${label}` : null;
  }).filter(Boolean);
  return parts.length ? parts.join(', ') : null;
}

// The Build tab's description/terms fields are a single textarea with a
// markdown-lite toolbar (FormattedTextArea: **bold**, "• " line prefixes)
// rather than a rich-text editor, so no schema change was needed for
// formatting — it's parsed back out here at render time instead.
function renderFormatted(text: string, keyPrefix: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith('**') && part.endsWith('**') && part.length > 4 ? (
      <strong key={`${keyPrefix}-${i}`}>{part.slice(2, -2)}</strong>
    ) : (
      <span key={`${keyPrefix}-${i}`}>{part}</span>
    ),
  );
}

// A line typed via the toolbar's "• List" button already carries a leading
// "• "/"-"/"*" glyph — strip it before wrapping in <li>, whose own list-disc
// marker would otherwise double it up. Left alone in the plain-paragraph
// branch below, where that glyph is the only bullet marker there is.
function stripBulletGlyph(line: string): string {
  return line.replace(/^[•\-*]\s+/, '');
}

// Renders a bulleted <ul> only when the consultant explicitly opted in
// (details.descriptionBullets, set from the Build tab's "Show as bullet
// points in report" checkbox) — never automatically just because the text
// happens to span multiple lines. Otherwise renders as a plain paragraph,
// preserving manual line breaks via white-space: pre-line.
function DescriptionBlock({ text, bullets, className }: { text: string; bullets?: boolean | null; className?: string }) {
  if (bullets) {
    const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
    return (
      <ul className={`list-disc space-y-0.5 pl-4 ${className ?? ''}`}>
        {lines.map((line, i) => (
          <li key={i}>{renderFormatted(stripBulletGlyph(line), `d${i}`)}</li>
        ))}
      </ul>
    );
  }
  return <p className={`whitespace-pre-line ${className ?? ''}`}>{renderFormatted(text, 'd')}</p>;
}

// Package terms are free text a consultant types or an AI draft generates —
// sometimes one clause per line, sometimes "·"-separated within a line (or
// both, e.g. an "INCLUDES:" line and an "EXCLUDES:" line each themselves
// "·"-joined), sometimes just plain sentences. Split each line on "·" first
// so every item gets its own bullet, then fall back to sentence-splitting
// only when nothing multi-part was found at all; a single clause reads
// better as plain text than as a list with one bullet.
function splitTermsClauses(text: string): string[] {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  const clauses = lines.flatMap((line) => (line.includes('·') ? line.split('·').map((c) => c.trim()).filter(Boolean) : [line]));
  if (clauses.length > 1) return clauses;
  return text.split(/(?<=[.!?])\s+(?=[A-Z(])/).map((c) => c.trim()).filter(Boolean);
}

// Package Terms are edited with a real WYSIWYG editor (RichTextEditor) and
// stored as actual HTML — rendered verbatim here rather than re-parsed, so
// the client sees exactly what the consultant formatted. Older itineraries
// saved before that editor existed hold plain text with no tags; detecting
// that (no "<" at all) keeps them readable via the previous line/clause
// splitting instead of dumping raw angle-bracket-free text unstyled.
function looksLikeHtml(text: string): boolean {
  return /<[a-z][\s\S]*>/i.test(text);
}

function TermsBlock({ text }: { text: string }) {
  if (looksLikeHtml(text)) {
    return <div className="prose prose-sm mt-1 max-w-none text-slate-600" dangerouslySetInnerHTML={{ __html: text }} />;
  }
  const clauses = splitTermsClauses(text);
  if (clauses.length <= 1) {
    return <p className="mt-1 whitespace-pre-line text-sm text-slate-600">{renderFormatted(text, 't')}</p>;
  }
  return (
    <ul className="mt-1 list-disc space-y-1 pl-4 text-sm text-slate-600">
      {clauses.map((clause, i) => (
        <li key={i}>{renderFormatted(stripBulletGlyph(clause), `t${i}`)}</li>
      ))}
    </ul>
  );
}

// Shared presentational component — rendered both as the authenticated
// Final-tab preview and (unmodified) on the public /itinerary/[id]/final
// page, so what a consultant previews is exactly what a client sees.
export function ItineraryReport({ data }: { data: ItineraryReportData }) {
  return (
    <div className="mx-auto max-w-3xl bg-white text-slate-800 print:p-0">
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <span className="text-lg font-bold text-brand">holiday vibez</span>
        <div className="text-right">
          <p className="text-xs uppercase tracking-wide text-slate-400">Package ID</p>
          <p className="text-lg font-bold text-brand">#{data.refNo}</p>
        </div>
      </div>

      <div className="relative mt-4 overflow-hidden rounded-xl" style={{ height: 260 }}>
        {/* Image URLs reach this component in either shape: the storage
            endpoint returns an API-relative "/uploads/..." path, while uploads
            made through the Build tab are already absolute. Resolve on render
            so both work — a relative path would otherwise be resolved against
            the web origin, where nothing serves it. */}
        {data.coverPhotoUrl ? (
          <img src={absoluteUploadUrl(data.coverPhotoUrl)} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-brand-100 to-emerald-100" />
        )}
        {/* Cover photos are consultant-supplied and often bright at the base
            (sand, sky, water), which washed the overlaid title out to
            unreadable. A heavier three-stop scrim plus a text shadow keeps
            the type legible over any photo without dimming the whole image. */}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/55 to-transparent px-4 pb-4 pt-16 text-white [text-shadow:0_1px_3px_rgba(0,0,0,0.6)]">
          <h1 className="text-2xl font-bold">{data.title}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-3 text-sm">
            <span className="rounded-full bg-white/25 px-3 py-0.5">{data.destinations.join(', ')}</span>
            <span>
              Adults: {data.adultsCount} {data.childrenCount ? `· Children: ${data.childrenCount}` : ''}
            </span>
            <span>
              {formatDate(data.startDate)} – {formatDate(data.endDate)}
            </span>
          </div>
        </div>
      </div>

      {data.pricingOptions.length > 0 && (
        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {data.pricingOptions.map((option) => {
            const totalPax = Math.max(1, data.adultsCount + data.childrenCount);
            const perPerson = option.totalIncludingGst / totalPax;
            return (
              <div key={option.id} className="rounded-xl border border-slate-200 p-4">
                <p className="text-xs font-semibold uppercase text-slate-400">{option.label}</p>
                {option.accommodations.map((a) => (
                  <p key={a.id} className="mt-1 text-sm font-medium text-slate-700">
                    {a.name}
                    <StarRating details={a.details} />
                  </p>
                ))}
                <p className="mt-2 text-lg font-bold text-brand">
                  {option.totalIncludingGst.toLocaleString('en-IN')} INR
                </p>
                <p className="text-xs text-slate-400">Total Including GST</p>
                <p className="mt-1 text-xs font-medium text-slate-500">
                  {perPerson.toLocaleString('en-IN', { maximumFractionDigits: 0 })} INR / person
                </p>
              </div>
            );
          })}
        </div>
      )}

      {data.pricingOptions.some((o) => o.accommodations.length > 0) && (
        <div className="mt-8">
          <h2 className="text-lg font-bold text-slate-800">Hotels</h2>
          <div className="mt-3 space-y-5">
            {data.pricingOptions.flatMap((option) =>
              option.accommodations.map((a) => {
                const room = roomSummary(a.details);
                const roomMeal = [room && `Room: ${room}`, a.details?.mealPlan && `Meal: ${a.details.mealPlan}`, a.details?.roomName && `Room Type: ${a.details.roomName}`]
                  .filter(Boolean)
                  .join(' | ');
                const nights = a.date && a.endDate ? Math.round((new Date(a.endDate).getTime() - new Date(a.date).getTime()) / 86_400_000) : null;
                return (
                  <div key={`${option.id}-${a.id}`} className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                    <div className="border-l-4 border-brand bg-brand-50/60 px-4 py-2 text-sm font-semibold text-slate-700">
                      Hotel {option.label}
                    </div>
                    <div className="sm:flex">
                      {a.photoUrl && (
                        <div className="relative h-40 w-full shrink-0 sm:h-auto sm:w-48">
                          <img src={absoluteUploadUrl(a.photoUrl)} alt="" className="absolute inset-0 h-full w-full object-cover" />
                        </div>
                      )}
                      <div className="flex-1 p-4">
                        <p className="font-semibold text-slate-700">
                          {a.name}
                          <StarRating details={a.details} />
                        </p>
                        <div className="mt-2 space-y-0.5 text-xs text-slate-600">
                          {a.date && (
                            <p>
                              <span className="font-semibold text-slate-700">Check-in:</span> {formatDate(a.date)}
                            </p>
                          )}
                          {a.endDate && (
                            <p>
                              <span className="font-semibold text-slate-700">Check-out:</span> {formatDate(a.endDate)}
                            </p>
                          )}
                          {roomMeal && <p className="font-semibold text-slate-700">{roomMeal}</p>}
                        </div>
                        {nights !== null && nights > 0 && (
                          <span className="mt-2 inline-block rounded-lg bg-brand px-2.5 py-1 text-xs font-semibold text-white">
                            {nights} Night{nights === 1 ? '' : 's'} Stay
                          </span>
                        )}
                        {a.destination && <p className="mt-2 text-xs text-slate-400">{a.destination}</p>}
                        {a.description && <DescriptionBlock text={a.description} bullets={a.details?.descriptionBullets} className="mt-1.5 text-sm text-slate-500" />}
                      </div>
                    </div>
                  </div>
                );
              }),
            )}
          </div>
        </div>
      )}

      <div className="mt-8">
        <h2 className="text-lg font-bold text-slate-800">Detailed Itinerary</h2>
        <p className="text-sm text-slate-500">Day-wise breakdown of your journey including hotel stay, sightseeing and transfers</p>

        <div className="mt-4 space-y-4">
          {data.days.map((day) => (
            <div key={day.id}>
              <div className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white">
                Day {day.dayNumber}
                {day.date && ` – ${formatDate(day.date)}`}
              </div>
              <div className="mt-3 space-y-4">
                {day.events.map((event) =>
                  event.photoUrl ? (
                    <div key={event.id} className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm sm:flex sm:min-h-[11rem]">
                      {/* Fixed frame the photo fills and crops into — without it a
                          portrait photo's intrinsic height blows the card up to
                          several hundred pixels tall. */}
                      <div className="relative h-48 w-full sm:h-auto sm:w-64 sm:shrink-0">
                        <img src={absoluteUploadUrl(event.photoUrl)} alt="" className="absolute inset-0 h-full w-full object-cover" />
                      </div>
                      <div className="p-4 sm:p-5">
                        <p className="text-base font-semibold text-slate-800">
                          {event.name}
                          <StarRating details={event.details} />
                        </p>
                        {event.description && <DescriptionBlock text={event.description} bullets={event.details?.descriptionBullets} className="mt-1.5 text-sm leading-relaxed text-slate-500" />}
                      </div>
                    </div>
                  ) : (
                    <div key={event.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                      <p className="text-base font-semibold text-slate-800">
                        {event.name}
                        <StarRating details={event.details} />
                      </p>
                      {event.description && <DescriptionBlock text={event.description} bullets={event.details?.descriptionBullets} className="mt-1.5 text-sm leading-relaxed text-slate-500" />}
                    </div>
                  ),
                )}
                {day.events.length === 0 && <p className="text-sm text-slate-400">No events planned.</p>}
              </div>
            </div>
          ))}
        </div>
      </div>

      {data.images.length > 0 && (
        <div className="mt-8">
          <h2 className="text-lg font-bold text-slate-800">Gallery</h2>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {data.images.map((img) => (
              <img key={img.id} src={absoluteUploadUrl(img.url)} alt={img.caption ?? ''} className="h-40 w-full rounded-xl object-cover" />
            ))}
          </div>
        </div>
      )}

      {data.packageTerms && (
        <div className="mt-8 space-y-6">
          {(
            [
              ['Booking and Payment', data.packageTerms.bookingAndPayment],
              ['Pricing and Inclusions', data.packageTerms.pricingAndInclusions],
              ['Cancellations and Refunds', data.packageTerms.cancellationsAndRefunds],
              ['Liability', data.packageTerms.liability],
            ] as const
          ).map(([heading, body]) =>
            body ? (
              <div key={heading}>
                <h3 className="text-base font-bold text-brand">{heading}</h3>
                <TermsBlock text={body} />
              </div>
            ) : null,
          )}
        </div>
      )}

      <ContactFooter consultant={data.consultant} />
    </div>
  );
}
