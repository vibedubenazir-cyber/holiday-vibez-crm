import { absoluteUploadUrl } from '@/lib/upload';

// Only the type-specific field the client report surfaces. The full shape
// lives in ItineraryEventDetails (shared) — this component deliberately reads
// just what it renders so the public API payload satisfies it structurally.
export interface ItineraryReportDetails {
  hotelCategory?: number | null;
  roomName?: string | null;
  mealPlan?: string | null;
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
          {data.pricingOptions.map((option) => (
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
            </div>
          ))}
        </div>
      )}

      {data.pricingOptions.some((o) => o.accommodations.length > 0) && (
        <div className="mt-8">
          <h2 className="text-lg font-bold text-slate-800">Hotels</h2>
          <div className="mt-3 space-y-4">
            {/* Dedupe by id — the same hotel is usually attached to several
                pricing options (that's the point of options), and the client
                should see each property listed once, not once per option. */}
            {Array.from(new Map(data.pricingOptions.flatMap((o) => o.accommodations).map((a) => [a.id, a])).values()).map((a) => {
              const facts = [a.destination, a.details?.roomName, a.details?.mealPlan, a.date && a.endDate ? `${formatDate(a.date)} – ${formatDate(a.endDate)}` : null].filter(Boolean);
              return (
                <div key={a.id} className="flex gap-4 border-b border-slate-100 pb-3">
                  {a.photoUrl && (
                    <img src={absoluteUploadUrl(a.photoUrl)} alt="" className="h-20 w-28 shrink-0 rounded-lg object-cover" />
                  )}
                  <div>
                    <p className="font-semibold text-slate-700">
                      {a.name}
                      <StarRating details={a.details} />
                    </p>
                    {facts.length > 0 && <p className="text-xs text-slate-400">{facts.join(' · ')}</p>}
                    {a.description && <p className="mt-1 text-sm text-slate-500">{a.description}</p>}
                  </div>
                </div>
              );
            })}
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
                        {event.description && <p className="mt-1.5 text-sm leading-relaxed text-slate-500">{event.description}</p>}
                      </div>
                    </div>
                  ) : (
                    <div key={event.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                      <p className="text-base font-semibold text-slate-800">
                        {event.name}
                        <StarRating details={event.details} />
                      </p>
                      {event.description && <p className="mt-1.5 text-sm leading-relaxed text-slate-500">{event.description}</p>}
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
                <p className="mt-1 whitespace-pre-line text-sm text-slate-600">{body}</p>
              </div>
            ) : null,
          )}
        </div>
      )}
    </div>
  );
}
