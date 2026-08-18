'use client';

import { useEffect, useState } from 'react';
import { formatCountdown, KIND_LABELS, reminderDate, type ScheduleItem } from './tripSchedule';

/**
 * Best-effort in-app alarms, layered on top of the calendar export in
 * tripIcs.ts — never instead of it.
 *
 * A page can only run timers while it is alive, so this covers the case where
 * the traveller has the app open or recently backgrounded. The calendar file
 * is what covers a closed app, a locked phone, and no signal. The UI says as
 * much, because a traveller who believes this alone will wake them for a 5am
 * transfer would be relying on something that cannot deliver.
 */

// setTimeout is stored as a signed 32-bit int, so anything beyond ~24.8 days
// overflows and fires immediately. Only arm alarms inside a day-long horizon
// and re-arm on an interval.
const HORIZON_MS = 24 * 60 * 60 * 1000;
const REARM_INTERVAL_MS = 60 * 60 * 1000;

export type NotifyPermission = 'unsupported' | 'default' | 'granted' | 'denied';

export function notificationPermission(): NotifyPermission {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
  return Notification.permission as NotifyPermission;
}

export async function requestNotificationPermission(): Promise<NotifyPermission> {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
  return (await Notification.requestPermission()) as NotifyPermission;
}

/**
 * A short two-tone chime via Web Audio. A Notification's own sound is at the
 * OS's discretion and is silent on several desktop browsers, so the audible
 * part is generated here rather than assumed.
 */
function chime() {
  try {
    const Ctx = window.AudioContext ?? (window as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const now = ctx.currentTime;
    [880, 1174].forEach((freq, index) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = freq;
      osc.type = 'sine';
      // Ramp rather than switching abruptly — a hard gain edge clicks.
      gain.gain.setValueAtTime(0.0001, now + index * 0.35);
      gain.gain.exponentialRampToValueAtTime(0.4, now + index * 0.35 + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + index * 0.35 + 0.3);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now + index * 0.35);
      osc.stop(now + index * 0.35 + 0.32);
    });
    setTimeout(() => ctx.close(), 1500);
  } catch {
    // An audio failure must never take the notification down with it.
  }
}

function fire(entry: ScheduleItem) {
  const body = `${entry.title}${entry.location ? ` · ${entry.location}` : ''}`;
  try {
    new Notification(`${KIND_LABELS[entry.kind]} ${formatCountdown(entry.remindMinutesBefore)}`, {
      body,
      icon: '/logo.png',
      tag: entry.id,
    });
  } catch {
    // Some browsers throw when constructing a Notification on mobile; the
    // chime below still gives the traveller something.
  }
  chime();
}

/**
 * Arms a timer for every reminder falling inside the next 24 hours, and
 * re-arms hourly so a long-running session keeps picking up later ones.
 */
export function useTripReminders(items: ScheduleItem[], enabled: boolean) {
  useEffect(() => {
    if (!enabled || typeof window === 'undefined' || !('Notification' in window)) return;
    if (Notification.permission !== 'granted') return;

    let timers: ReturnType<typeof setTimeout>[] = [];

    function arm() {
      timers.forEach(clearTimeout);
      timers = [];
      const now = Date.now();
      for (const entry of items) {
        const delay = reminderDate(entry).getTime() - now;
        if (delay <= 0 || delay > HORIZON_MS) continue;
        timers.push(setTimeout(() => fire(entry), delay));
      }
    }

    arm();
    const interval = setInterval(arm, REARM_INTERVAL_MS);
    return () => {
      timers.forEach(clearTimeout);
      clearInterval(interval);
    };
  }, [items, enabled]);
}

/** Tracks permission state across the grant prompt. */
export function useNotificationPermission(): [NotifyPermission, () => Promise<void>] {
  const [permission, setPermission] = useState<NotifyPermission>('default');

  useEffect(() => {
    setPermission(notificationPermission());
  }, []);

  async function request() {
    setPermission(await requestNotificationPermission());
  }

  return [permission, request];
}
