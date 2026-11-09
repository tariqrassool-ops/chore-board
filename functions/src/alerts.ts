// Which chores need a web push right now. Pure logic, so it can be tested without Firebase.
import { addDays, dueAt, occurrences, startOfDay } from './shared/schedule';
import type { Household } from './shared/types';

/** How late an alert may still be sent, e.g. after a missed run. */
export const LATE_LIMIT_MINUTES = 15;

export interface DueAlert {
  key: string;
  memberId: string;
  title: string;
  body: string;
}

/**
 * The wall-clock time in `timeZone`, as a Date whose local fields hold that time.
 * The schedule code works in local time, so this lets the server use it for any household.
 */
export function wallClock(now: Date, timeZone: string): Date {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-GB', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
    })
      .formatToParts(now)
      .map((p) => [p.type, p.value]),
  );
  return new Date(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute, +parts.second);
}

/** Chores due in the last few minutes that are assigned, not done, and not yet alerted. */
export function dueAlerts(h: Household, now: Date): DueAlert[] {
  const local = wallClock(now, h.timeZone || 'UTC');
  const earliest = local.getTime() - LATE_LIMIT_MINUTES * 60_000;
  // Yesterday too, so a chore at 23:59 still alerts after midnight.
  return occurrences(h, addDays(startOfDay(local), -1), 2)
    .filter((o) => {
      const at = dueAt(o.date, o.time).getTime();
      return at <= local.getTime() && at > earliest && !h.done[o.key] && h.assign[o.key] && !h.alerted?.[o.key];
    })
    .map((o) => ({
      key: o.key,
      memberId: h.assign[o.key],
      title: `Time for: ${o.chore.name}`,
      body: `Due now (${o.time}). Tap to mark it done.`,
    }));
}

/** Alerted keys old enough to forget, so the household document doesn't grow forever. */
export function staleAlerted(h: Household, now: Date): string[] {
  const cutoff = now.getTime() - 3 * 86_400_000;
  return Object.entries(h.alerted ?? {})
    .filter(([, at]) => at < cutoff)
    .map(([k]) => k);
}
