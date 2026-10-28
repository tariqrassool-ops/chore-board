import type { Chore, Household, Member, Occurrence } from './types';

/** Days ahead that chores are dealt out for. */
export const HORIZON_DAYS = 14;
/** Days of finished chores that count towards someone's load. */
export const LOOKBACK_DAYS = 28;

const pad = (n: number) => String(n).padStart(2, '0');

export function dateKey(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function parseDate(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

export function startOfDay(d: Date = new Date()): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

const daysBetween = (a: Date, b: Date) => Math.round((b.getTime() - a.getTime()) / 864e5);

export const occurrenceKey = (choreId: string, date: string) => `${choreId}|${date}`;

export function splitKey(key: string): { choreId: string; date: string } {
  const i = key.lastIndexOf('|');
  return { choreId: key.slice(0, i), date: key.slice(i + 1) };
}

/** When a chore's occurrence on `date` is due, as a local Date. */
export function dueAt(date: string, time: string): Date {
  const d = parseDate(date);
  const [h, m] = time.split(':').map(Number);
  d.setHours(h || 0, m || 0, 0, 0);
  return d;
}

export function occursOn(chore: Chore, day: Date): boolean {
  const start = parseDate(chore.start);
  if (day < start) return false;
  const f = chore.freq;
  if (f.type === 'daily') return true;
  if (f.type === 'weekly') return f.days.includes(day.getDay());
  return daysBetween(start, day) % Math.max(1, f.n) === 0;
}

/** Every chore occurrence from `from` for `days` days, in time order. */
export function occurrences(h: Household, from: Date, days: number): Occurrence[] {
  const out: Occurrence[] = [];
  for (let i = 0; i < days; i++) {
    const day = addDays(startOfDay(from), i);
    const date = dateKey(day);
    for (const chore of h.chores) {
      if (occursOn(chore, day)) out.push({ key: occurrenceKey(chore.id, date), chore, date, time: chore.time });
    }
  }
  return out.sort((a, b) => (a.date === b.date ? a.time.localeCompare(b.time) : a.date.localeCompare(b.date)));
}

export function eligible(h: Household, chore: Chore): Member[] {
  const active = h.members.filter((m) => !m.paused);
  const allowed = chore.who.length ? active.filter((m) => chore.who.includes(m.id)) : active;
  return allowed.length ? allowed : active;
}

/** Who an occurrence belongs to: whoever did it, otherwise whoever it's assigned to. */
export function ownerOf(h: Household, key: string): string | undefined {
  return h.done[key]?.by ?? h.assign[key];
}

/**
 * Effort points per member: chores they finished in the lookback window,
 * plus chores assigned to them from today to the end of the horizon.
 * Missed chores don't count, so skipping a chore never lightens your load.
 */
export function loads(h: Household, today: Date): Record<string, number> {
  const t = startOfDay(today);
  const todayKey = dateKey(t);
  const from = dateKey(addDays(t, -LOOKBACK_DAYS));
  const to = dateKey(addDays(t, HORIZON_DAYS));
  const load: Record<string, number> = {};
  for (const m of h.members) load[m.id] = 0;

  for (const [key, rec] of Object.entries(h.done)) {
    const { date } = splitKey(key);
    if (date >= from && date <= to && load[rec.by] != null) load[rec.by] += rec.pts || 0;
  }
  for (const [key, memberId] of Object.entries(h.assign)) {
    const { choreId, date } = splitKey(key);
    if (date < todayKey || date > to || h.done[key] || load[memberId] == null) continue;
    const chore = h.chores.find((c) => c.id === choreId);
    if (chore && occursOn(chore, parseDate(date))) load[memberId] += chore.points || 1;
  }
  return load;
}

/**
 * Deal out every unassigned chore from today to the end of the horizon.
 * Each one goes to the eligible person with the lowest load for their share,
 * with a small penalty for getting the same chore twice in a row.
 * Returns only the new assignments, so callers can write just those.
 */
export function plan(h: Household, today: Date): Record<string, string> {
  const added: Record<string, string> = {};
  if (!h.members.some((m) => !m.paused) || !h.chores.length) return added;

  const load = loads(h, today);
  const last: Record<string, string> = {};
  const ordered = Object.keys(h.assign).sort((a, b) => splitKey(a).date.localeCompare(splitKey(b).date));
  for (const key of ordered) last[splitKey(key).choreId] = ownerOf(h, key)!;

  for (const occ of occurrences(h, today, HORIZON_DAYS)) {
    if (h.done[occ.key]) continue;
    const current = h.members.find((m) => m.id === h.assign[occ.key]);
    if (current && !current.paused) continue;

    const candidates = eligible(h, occ.chore);
    if (!candidates.length) continue;
    const pts = occ.chore.points || 1;
    let best: Member | null = null;
    let bestScore = Infinity;
    for (const m of candidates) {
      const share = m.share || 1;
      let score = (load[m.id] + pts) / share;
      if (last[occ.chore.id] === m.id && candidates.length > 1) score += (0.6 * pts) / share;
      if (score < bestScore - 1e-9) {
        bestScore = score;
        best = m;
      }
    }
    if (!best) continue;
    added[occ.key] = best.id;
    load[best.id] += pts;
    last[occ.chore.id] = best.id;
  }
  return added;
}

/** Keys of open assignments from today on, which a rebalance re-deals. */
export function openFutureKeys(h: Household, today: Date): string[] {
  const todayKey = dateKey(startOfDay(today));
  return Object.keys(h.assign).filter((k) => splitKey(k).date >= todayKey && !h.done[k]);
}

/** Points per member for the week containing `today` (Monday to Sunday). */
export function weekTotals(h: Household, today: Date) {
  const t = startOfDay(today);
  const monday = addDays(t, -((t.getDay() + 6) % 7));
  const todayKey = dateKey(t);
  const totals: Record<string, { done: number; planned: number }> = {};
  for (const m of h.members) totals[m.id] = { done: 0, planned: 0 };
  for (const occ of occurrences(h, monday, 7)) {
    const rec = h.done[occ.key];
    if (rec) {
      if (totals[rec.by]) totals[rec.by].done += rec.pts || occ.chore.points;
    } else if (occ.date >= todayKey) {
      const who = h.assign[occ.key];
      if (who && totals[who]) totals[who].planned += occ.chore.points;
    }
  }
  return totals;
}
