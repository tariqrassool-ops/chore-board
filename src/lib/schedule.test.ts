/// <reference types="jest" />
import { addDays, dateKey, loads, occurrences, occursOn, openFutureKeys, plan, weekTotals } from './schedule';
import { starterChores } from './starter';
import type { Chore, Household, Member } from './types';

const MONDAY = new Date(2026, 9, 5); // 5 Oct 2026

let n = 0;
const id = () => `id${n++}`;

function member(name: string, extra: Partial<Member> = {}): Member {
  return { id: name.toLowerCase(), name, color: 0, share: 1, ...extra };
}

function household(members: Member[], chores: Chore[] = starterChores(id, MONDAY)): Household {
  return { name: 'Test', members, chores, assign: {}, done: {} };
}

function pointsByMember(h: Household, assign: Record<string, string>, from: Date, days: number) {
  const totals: Record<string, number> = {};
  for (const o of occurrences(h, from, days)) {
    const who = assign[o.key];
    if (who) totals[who] = (totals[who] ?? 0) + o.chore.points;
  }
  return totals;
}

describe('occursOn', () => {
  const base: Omit<Chore, 'freq'> = { id: 'c', name: 'x', cat: 'other', points: 1, time: '09:00', who: [], start: '2026-10-05' };
  it('handles weekly days', () => {
    const c: Chore = { ...base, freq: { type: 'weekly', days: [6] } };
    expect(occursOn(c, new Date(2026, 9, 10))).toBe(true); // Saturday
    expect(occursOn(c, new Date(2026, 9, 9))).toBe(false);
  });
  it('handles every N days from the start date', () => {
    const c: Chore = { ...base, freq: { type: 'every', n: 3 } };
    expect([5, 6, 7, 8].map((d) => occursOn(c, new Date(2026, 9, d)))).toEqual([true, false, false, true]);
  });
  it('never occurs before the start date', () => {
    const c: Chore = { ...base, freq: { type: 'daily' } };
    expect(occursOn(c, new Date(2026, 9, 4))).toBe(false);
  });
});

describe('plan', () => {
  it('assigns every occurrence in the horizon and splits points evenly', () => {
    const h = household([member('A'), member('B'), member('C')]);
    const assign = plan(h, MONDAY);
    expect(Object.keys(assign)).toHaveLength(occurrences(h, MONDAY, 14).length);
    const totals = Object.values(pointsByMember(h, assign, MONDAY, 14));
    expect(Math.max(...totals) - Math.min(...totals)).toBeLessThanOrEqual(4);
  });

  it('gives a half share about half the points', () => {
    const h = household([member('A'), member('Kid', { share: 0.5 })]);
    const totals = pointsByMember(h, plan(h, MONDAY), MONDAY, 14);
    const ratio = totals.kid / totals.a;
    expect(ratio).toBeGreaterThan(0.4);
    expect(ratio).toBeLessThan(0.6);
  });

  it('skips people who are away', () => {
    const h = household([member('A'), member('B', { paused: true })]);
    expect(new Set(Object.values(plan(h, MONDAY)))).toEqual(new Set(['a']));
  });

  it('only uses people allowed to do a chore', () => {
    const chores = starterChores(id, MONDAY);
    chores[3].who = ['b']; // weekly shop
    const h = household([member('A'), member('B'), member('C')], chores);
    const assign = plan(h, MONDAY);
    const shop = Object.entries(assign).filter(([k]) => k.startsWith(chores[3].id + '|'));
    expect(shop.length).toBeGreaterThan(0);
    expect(shop.every(([, who]) => who === 'b')).toBe(true);
  });

  it('keeps existing assignments and only fills gaps', () => {
    const h = household([member('A'), member('B')]);
    h.assign = plan(h, MONDAY);
    expect(plan(h, MONDAY)).toEqual({});
  });

  it('gives more to someone who has done less recently', () => {
    const h = household([member('A'), member('B')]);
    // A did 20 points of work last week; B did nothing.
    for (let i = 0; i < 20; i++) {
      h.done[`old${i}|${dateKey(addDays(MONDAY, -3))}`] = { by: 'a', at: 0, pts: 1, name: 'x' };
    }
    const totals = pointsByMember(h, plan(h, MONDAY), MONDAY, 14);
    expect(totals.b).toBeGreaterThan(totals.a);
  });

  it('does not count missed chores as work done', () => {
    const h = household([member('A'), member('B')]);
    const yesterday = dateKey(addDays(MONDAY, -1));
    h.assign[`${h.chores[0].id}|${yesterday}`] = 'a'; // assigned but never done
    const l = loads(h, MONDAY);
    expect(l.a).toBe(0);
  });

  it('varies who gets the same chore', () => {
    const h = household([member('A'), member('B')]);
    const assign = plan(h, MONDAY);
    const feeds = occurrences(h, MONDAY, 14).filter((o) => o.chore.id === h.chores[0].id).map((o) => assign[o.key]);
    expect(new Set(feeds).size).toBe(2);
  });
});

describe('rebalance helpers', () => {
  it('only re-deals open chores from today on', () => {
    const h = household([member('A'), member('B')]);
    h.assign = plan(h, addDays(MONDAY, -2));
    const doneKey = occurrences(h, MONDAY, 1)[0].key;
    h.done[doneKey] = { by: 'a', at: 0, pts: 1, name: 'x' };
    const keys = openFutureKeys(h, MONDAY);
    expect(keys).not.toContain(doneKey);
    expect(keys.every((k) => k.split('|')[1] >= '2026-10-05')).toBe(true);
  });
});

describe('weekTotals', () => {
  it('counts done and still-to-do points for the current week', () => {
    const h = household([member('A'), member('B')]);
    h.assign = plan(h, MONDAY);
    const first = occurrences(h, MONDAY, 1)[0];
    h.done[first.key] = { by: 'b', at: 0, pts: first.chore.points, name: first.chore.name };
    const totals = weekTotals(h, MONDAY);
    expect(totals.b.done).toBe(first.chore.points);
    const weekPoints = occurrences(h, MONDAY, 7).reduce((s, o) => s + o.chore.points, 0);
    expect(totals.a.done + totals.a.planned + totals.b.done + totals.b.planned).toBe(weekPoints);
  });
});
