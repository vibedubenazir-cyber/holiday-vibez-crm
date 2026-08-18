'use client';

import type { Trip, TripHotel, TripTransfer } from './traveler';

/**
 * Derives the time-critical moments of a trip — flights, hotel check-in and
 * check-out, and airport transfers — from the trip data the /trip app already
 * caches, so this works with no network.
 *
 * These are the things a traveller needs an alarm for. Sightseeing that merely
 * has a start time is deliberately excluded: burying three real alarms among
 * twenty soft ones is how people start ignoring all of them.
 */

export type ScheduleKind = 'FLIGHT' | 'CHECK_IN' | 'CHECK_OUT' | 'TRANSFER';

export interface ScheduleItem {
  id: string;
  kind: ScheduleKind;
  title: string;
  location: string | null;
  /**
   * A wall-clock time ("2026-11-10T14:00") with no zone, or a real instant
   * (ISO with Z). Hotel check-in at 14:00 is 14:00 wherever the hotel is, so
   * it stays floating and the phone resolves it against local time once the
   * traveller lands. Transfers are stored as true timestamps, so they stay
   * absolute. Getting this wrong shifts an airport pickup by hours.
   */
  at: string;
  absolute: boolean;
  /** How long before `at` the alarm should sound. */
  remindMinutesBefore: number;
}

const REMIND_BEFORE: Record<ScheduleKind, number> = {
  // Three hours covers the standard international airport cutoff, and is what
  // the same alarm should give you before a hotel check-in.
  FLIGHT: 180,
  CHECK_IN: 180,
  CHECK_OUT: 60,
  TRANSFER: 60,
};

export const KIND_LABELS: Record<ScheduleKind, string> = {
  FLIGHT: 'Flight',
  CHECK_IN: 'Hotel check-in',
  CHECK_OUT: 'Hotel check-out',
  TRANSFER: 'Transfer',
};

/**
 * Takes the calendar date out of an ISO string textually rather than via the
 * Date getters. Prisma serialises a `@db.Date` as UTC midnight, so
 * `new Date(value).getDate()` returns the previous day for anyone west of
 * Greenwich — a day-shifted check-in alarm.
 */
function datePart(iso: string): string | null {
  const match = /^(\d{4}-\d{2}-\d{2})/.exec(iso);
  return match ? match[1] : null;
}

/** Normalises "9:5", "09:05", "09:05:00" to "09:05"; rejects anything else. */
function timePart(value: string | null): string | null {
  if (!value) return null;
  const match = /^(\d{1,2}):(\d{2})/.exec(value.trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

function floating(date: string | null, time: string | null): string | null {
  if (!date) return null;
  const day = datePart(date);
  const clock = timePart(time);
  if (!day || !clock) return null;
  return `${day}T${clock}`;
}

function item(
  id: string,
  kind: ScheduleKind,
  title: string,
  location: string | null,
  at: string,
  absolute: boolean,
): ScheduleItem {
  return { id, kind, title, location, at, absolute, remindMinutesBefore: REMIND_BEFORE[kind] };
}

function hotelItems(hotels: TripHotel[]): ScheduleItem[] {
  const out: ScheduleItem[] = [];
  for (const hotel of hotels) {
    // Default to the industry-standard times when the consultant left them
    // blank, rather than dropping the alarm entirely — a check-in with no
    // reminder is the failure this feature exists to prevent.
    const checkIn = floating(hotel.checkIn, hotel.checkInTime ?? '14:00');
    if (checkIn) {
      out.push(item(`${hotel.id}-in`, 'CHECK_IN', hotel.name, hotel.destination, checkIn, false));
    }
    const checkOut = floating(hotel.checkOut, hotel.checkOutTime ?? '11:00');
    if (checkOut) {
      out.push(item(`${hotel.id}-out`, 'CHECK_OUT', hotel.name, hotel.destination, checkOut, false));
    }
  }
  return out;
}

function transferItems(transfers: TripTransfer[]): ScheduleItem[] {
  return transfers.flatMap((transfer) => {
    if (!transfer.scheduledAt) return [];
    const route = [transfer.fromLocation, transfer.toLocation].filter(Boolean).join(' → ');
    const driver = transfer.driverName ? ` · ${transfer.driverName}` : '';
    return [
      item(
        transfer.id,
        'TRANSFER',
        `${route || 'Transfer'}${driver}`,
        transfer.fromLocation,
        transfer.scheduledAt,
        true,
      ),
    ];
  });
}

function flightItems(trip: Trip): ScheduleItem[] {
  const days = trip.itinerary?.days ?? [];
  return days.flatMap((day) =>
    day.events.flatMap((event) => {
      if (event.type !== 'FLIGHT') return [];
      const at = floating(event.date ?? day.date, event.startTime);
      if (!at) return [];
      return [item(event.id, 'FLIGHT', event.name, event.destination, at, false)];
    }),
  );
}

/**
 * Collapses entries that describe the same real-world moment.
 *
 * `trip.hotels` carries one row per pricing option, so a hotel offered under
 * both Option 1 and Option 2 arrives twice — and would otherwise produce two
 * identical check-in alarms three hours before the same check-in. Identity is
 * the moment itself (kind + title + time), not the row id, precisely because
 * the duplicate rows have different ids.
 */
function dedupe(items: ScheduleItem[]): ScheduleItem[] {
  const seen = new Set<string>();
  return items.filter((entry) => {
    const key = `${entry.kind}|${entry.title}|${entry.at}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** Every alarm-worthy moment of the trip, earliest first. */
export function buildSchedule(trip: Trip): ScheduleItem[] {
  const all = [...flightItems(trip), ...hotelItems(trip.hotels), ...transferItems(trip.transfers)];
  return dedupe(all).sort((a, b) => toDate(a).getTime() - toDate(b).getTime());
}

/** Resolves an item to a Date in the device's current timezone. */
export function toDate(entry: ScheduleItem): Date {
  return new Date(entry.at);
}

export function reminderDate(entry: ScheduleItem): Date {
  return new Date(toDate(entry).getTime() - entry.remindMinutesBefore * 60_000);
}

function humanise(minutes: number): string {
  if (minutes % 60 !== 0) return `${minutes} minutes`;
  const hours = minutes / 60;
  return `${hours} hour${hours === 1 ? '' : 's'}`;
}

/** "3 hours before" — describes the setting, for the schedule list. */
export function formatRemindBefore(minutes: number): string {
  return `${humanise(minutes)} before`;
}

/** "in 3 hours" — read at the moment the alarm fires. */
export function formatCountdown(minutes: number): string {
  return `in ${humanise(minutes)}`;
}

/**
 * How far away something is, in the coarsest useful unit: a traveller
 * checking "when is my flight" wants "in 3 days", not "in 68 hours".
 */
export function formatRelative(target: Date, now: Date): string {
  const minutes = Math.round((target.getTime() - now.getTime()) / 60_000);
  if (minutes < 0) return 'done';
  if (minutes < 60) return `in ${minutes} min`;
  if (minutes < 24 * 60) return `in ${Math.round(minutes / 60)} hr`;
  const days = Math.round(minutes / (24 * 60));
  return days === 1 ? 'tomorrow' : `in ${days} days`;
}
