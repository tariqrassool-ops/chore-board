// Which chores need a web push right now. Pure logic, so it can be tested without Firebase.
import { addDays, dueAt, occurrences, startOfDay } from './shared/schedule';
import type { Household } from './shared/types';

/**
 * How long after its time a chore keeps alerting. GitHub's scheduled runs are often 10+ minutes
 * late, so this is generous.
 */
export const LATE_LIMIT_MINUTES = 45;

/**
 * A web notification can't keep ringing like an alarm, so an alert is sent again on each run
 * at least this long after the last one, until the chore is marked done or LATE_LIMIT_MINUTES
 * pass. Just under the 5-minute schedule, so a run that is slightly early still repeats it.
 */
export const REPEAT_MINUTES = 4;

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

/**
 * Chores due in the last LATE_LIMIT_MINUTES that are assigned and not done, and haven't been
 * alerted in the last REPEAT_MINUTES.
 */
export function dueAlerts(h: Household, now: Date): DueAlert[] {
  const local = wallClock(now, h.timeZone || 'UTC');
  const earliest = local.getTime() - LATE_LIMIT_MINUTES * 60_000;
  // Yesterday too, so a chore at 23:59 still alerts after midnight.
  return occurrences(h, addDays(startOfDay(local), -1), 2)
    .filter((o) => {
      const at = dueAt(o.date, o.time).getTime();
      const last = h.alerted?.[o.key];
      const recentlyAlerted = last !== undefined && now.getTime() - last < REPEAT_MINUTES * 60_000;
      return at <= local.getTime() && at > earliest && !h.done[o.key] && h.assign[o.key] && !recentlyAlerted;
    })
    .map((o) => ({
      key: o.key,
      memberId: h.assign[o.key],
      title: `Time for: ${o.chore.name}`,
      body: h.alerted?.[o.key]
        ? `Still to do, due at ${o.time}. Tap to mark it done and stop these alerts.`
        : `Due at ${o.time}. Tap to mark it done.`,
    }));
}

/** Alerted keys old enough to forget, so the household document doesn't grow forever. */
export function staleAlerted(h: Household, now: Date): string[] {
  const cutoff = now.getTime() - 3 * 86_400_000;
  return Object.entries(h.alerted ?? {})
    .filter(([, at]) => at < cutoff)
    .map(([k]) => k);
}
