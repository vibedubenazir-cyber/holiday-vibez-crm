'use client';

import { formatCountdown, KIND_LABELS, toDate, type ScheduleItem } from './tripSchedule';

/**
 * Builds an iCalendar file so the traveller's own phone calendar owns the
 * alarms.
 *
 * This is deliberately not a web-notification schedule. A PWA cannot wake
 * itself at a set time on iOS, and server push needs a network the traveller
 * won't have on an aeroplane or abroad without roaming. The native calendar
 * fires its alarm with sound, offline, with the app closed — the only
 * mechanism that actually holds up at 4am before a departure transfer.
 */

const PRODID = '-//Holiday Vibez//Traveller Companion//EN';

/** Escapes the characters RFC 5545 gives meaning to inside a property value. */
function esc(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

/** UTC form (…Z) — used for DTSTAMP and for genuinely absolute times. */
function utcStamp(date: Date): string {
  return (
    `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}` +
    `T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}Z`
  );
}

/**
 * Floating form (no Z, no TZID) for wall-clock times. A 14:00 hotel check-in
 * should alarm at 14:00 local to wherever the traveller physically is, which
 * is exactly what a floating time means to a calendar client.
 */
function floatingStamp(value: string): string {
  return `${value.slice(0, 10).replace(/-/g, '')}T${value.slice(11, 16).replace(':', '')}00`;
}

function dtstart(entry: ScheduleItem): string {
  return entry.absolute ? utcStamp(toDate(entry)) : floatingStamp(entry.at);
}

/**
 * RFC 5545 caps a content line at 75 octets; longer lines continue on the next
 * line prefixed with a space. Some calendar importers reject the file outright
 * without this, so it isn't optional cosmetics.
 */
function fold(line: string): string {
  if (line.length <= 75) return line;
  const parts: string[] = [line.slice(0, 75)];
  for (let i = 75; i < line.length; i += 74) parts.push(` ${line.slice(i, i + 74)}`);
  return parts.join('\r\n');
}

function vevent(entry: ScheduleItem, stamp: string, tripTitle: string): string[] {
  const alarmText = `${KIND_LABELS[entry.kind]} ${formatCountdown(entry.remindMinutesBefore)} — ${entry.title}`;
  const lines = [
    'BEGIN:VEVENT',
    `UID:${entry.id}@holidayvibez`,
    `DTSTAMP:${stamp}`,
    `DTSTART:${dtstart(entry)}`,
    `SUMMARY:${esc(`${KIND_LABELS[entry.kind]}: ${entry.title}`)}`,
    `DESCRIPTION:${esc(tripTitle)}`,
  ];
  if (entry.location) lines.push(`LOCATION:${esc(entry.location)}`);
  lines.push(
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    `TRIGGER:-PT${entry.remindMinutesBefore}M`,
    `DESCRIPTION:${esc(alarmText)}`,
    'END:VALARM',
    'END:VEVENT',
  );
  return lines;
}

export function buildTripIcs(items: ScheduleItem[], tripTitle: string): string {
  const stamp = utcStamp(new Date());
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    `PRODID:${PRODID}`,
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${esc(tripTitle)}`,
    ...items.flatMap((entry) => vevent(entry, stamp, tripTitle)),
    'END:VCALENDAR',
  ];
  return lines.map(fold).join('\r\n');
}

/**
 * Hands the file to the OS. On iOS and Android this opens the calendar's
 * import sheet; the alarms then live in the phone's calendar, independent of
 * this app and of any network.
 */
export function downloadTripIcs(items: ScheduleItem[], tripTitle: string) {
  const blob = new Blob([buildTripIcs(items, tripTitle)], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'my-trip.ics';
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Revoking immediately can cancel the navigation on some mobile browsers.
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
