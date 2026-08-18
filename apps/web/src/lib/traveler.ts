'use client';

// Client-side plumbing for the traveller companion app (/trip).
//
// Deliberately separate from lib/api.ts: that module holds the *staff* access
// token in memory and refreshes it via an httpOnly cookie. A traveller's
// device is offline for long stretches abroad, so their token is persisted to
// localStorage and is long-lived by design — a different trade-off, kept in a
// different file so neither can accidentally reach for the other's token.

const TOKEN_KEY = 'hv_trip_token';
const TRIP_CACHE_KEY = 'hv_trip_cache';
const TRAVELER_KEY = 'hv_trip_traveler';

export interface TripEvent {
  id: string;
  type: string;
  name: string;
  destination: string | null;
  date: string | null;
  startTime: string | null;
  endTime: string | null;
  showTime: boolean;
  description: string | null;
  photoUrl: string | null;
  details?: Record<string, unknown> | null;
}

export interface TripDay {
  id: string;
  dayNumber: number;
  date: string | null;
  events: TripEvent[];
}

export interface TripHotel {
  id: string;
  optionLabel: string;
  name: string;
  destination: string | null;
  checkIn: string | null;
  checkOut: string | null;
  checkInTime: string | null;
  checkOutTime: string | null;
  photoUrl: string | null;
  description: string | null;
  details?: Record<string, unknown> | null;
}

export interface TripTransfer {
  id: string;
  type: string;
  scheduledAt: string | null;
  fromLocation: string | null;
  toLocation: string | null;
  driverName: string | null;
  driverPhone: string | null;
  vehicleNumber: string | null;
  vehicleType: string | null;
  notes: string | null;
}

export interface CountryGuide {
  country: string;
  emergencyPolice: string | null;
  emergencyMedical: string | null;
  embassyName: string | null;
  embassyPhone: string | null;
  embassyAddress: string | null;
  cabServices: { name: string; phone?: string; notes?: string }[] | null;
  restaurants: { name: string; address?: string; phone?: string; cuisine?: string }[] | null;
  notes: string | null;
}

export interface Trip {
  traveler: { id: string; name: string } | null;
  booking: { id: string; status: string; departureDate: string; returnDate: string | null; clientName: string };
  itinerary: {
    refNo: string;
    title: string;
    destinations: string[];
    startDate: string | null;
    endDate: string | null;
    adultsCount: number;
    childrenCount: number;
    coverPhotoUrl: string | null;
    /** IANA zone of the destination; times are shown on this clock. */
    timezone: string | null;
    days: TripDay[];
    packageTerms: Record<string, string | null> | null;
  } | null;
  hotels: TripHotel[];
  transfers: TripTransfer[];
  countryGuides: CountryGuide[];
  support: { companyName: string; emergencyPhone: string; email: string };
  syncedAt: string;
}

export function getTripToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setTripToken(token: string, travelerName: string) {
  window.localStorage.setItem(TOKEN_KEY, token);
  window.localStorage.setItem(TRAVELER_KEY, travelerName);
}

export function getTravelerName(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(TRAVELER_KEY);
}

export function signOutTraveler() {
  window.localStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(TRAVELER_KEY);
  window.localStorage.removeItem(TRIP_CACHE_KEY);
}

export class TripApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`/api${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new TripApiError(res.status, typeof data.message === 'string' ? data.message : 'Something went wrong');
  return data as T;
}

export function requestOtp(identifier: string) {
  return post<{ sent: boolean }>('/traveler/auth/request-otp', { identifier });
}

export function verifyOtp(identifier: string, code: string) {
  return post<{ token: string; traveler: { id: string; name: string }; bookingId: string }>(
    '/traveler/auth/verify-otp',
    { identifier, code },
  );
}

/** The cached copy, or null. Read synchronously so the UI can paint instantly. */
export function readCachedTrip(): Trip | null {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(TRIP_CACHE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Trip;
  } catch {
    return null;
  }
}

/**
 * Fetches the trip and writes it to the offline cache.
 *
 * Callers render `readCachedTrip()` first and treat a thrown error here as
 * "stay on the cached copy" rather than an error state — that's the whole
 * point of the app: a traveller standing in an airport with no data still
 * needs their hotel address and driver's number.
 */
export async function fetchTrip(): Promise<Trip> {
  const token = getTripToken();
  if (!token) throw new TripApiError(401, 'Not signed in');

  const res = await fetch('/api/traveler/trip', { headers: { Authorization: `Bearer ${token}` } });
  if (res.status === 401) {
    signOutTraveler();
    throw new TripApiError(401, 'Your session expired — sign in again');
  }
  if (!res.ok) throw new TripApiError(res.status, 'Could not refresh your trip');

  const trip = (await res.json()) as Trip;
  try {
    window.localStorage.setItem(TRIP_CACHE_KEY, JSON.stringify(trip));
  } catch {
    // Quota exceeded on a very small device — the app still works online.
  }
  return trip;
}

export type TripDocumentType =
  | 'PASSPORT'
  | 'VISA'
  | 'FLIGHT_TICKET'
  | 'HOTEL_VOUCHER'
  | 'INSURANCE'
  | 'ID_PROOF'
  | 'OTHER';

export interface TripDocument {
  id: string;
  type: TripDocumentType;
  label: string;
  mimeType: string;
  sizeBytes: number;
  ownerName: string | null;
  /** True when every traveller on the booking can see it. */
  sharedWithBooking: boolean;
  addedByStaff: boolean;
  createdAt: string;
}

export async function fetchDocuments(): Promise<TripDocument[]> {
  const token = getTripToken();
  if (!token) throw new TripApiError(401, 'Not signed in');
  const res = await fetch('/api/traveler/documents', {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new TripApiError(res.status, 'Could not load your documents');
  return (await res.json()) as TripDocument[];
}

/**
 * Uploads with a raw fetch rather than the JSON helper: a multipart body must
 * not carry a Content-Type we set ourselves, or the boundary is lost.
 */
export async function uploadDocument(file: File, type: TripDocumentType, label: string) {
  const token = getTripToken();
  const body = new FormData();
  body.append('file', file);
  body.append('type', type);
  body.append('label', label);

  const res = await fetch('/api/traveler/documents', {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body,
  });
  if (!res.ok) throw new TripApiError(res.status, 'Could not upload that file');
  return (await res.json()) as TripDocument;
}

export async function deleteDocument(id: string) {
  const token = getTripToken();
  const res = await fetch(`/api/traveler/documents/${id}`, {
    method: 'DELETE',
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  if (!res.ok) throw new TripApiError(res.status, 'Could not remove that document');
}

/**
 * Documents are streamed from an authenticated endpoint, so they can't be a
 * plain href — the browser wouldn't send the token. Fetch the bytes, then hand
 * the blob to the OS.
 */
export async function openDocument(doc: TripDocument) {
  const token = getTripToken();
  const res = await fetch(`/api/traveler/documents/${doc.id}/file`, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  if (!res.ok) throw new TripApiError(res.status, 'Could not open that document');
  const url = URL.createObjectURL(await res.blob());
  const link = document.createElement('a');
  link.href = url;
  link.download = doc.label;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
