import assert from 'node:assert/strict';
import { test } from 'node:test';
import { dueAlerts, staleAlerted, wallClock } from './alerts';
import type { Household } from './shared/types';

function household(extra: Partial<Household> = {}): Household {
  return {
    name: 'Test',
    timeZone: 'Europe/London',
    members: [{ id: 'a', name: 'A', color: 0, share: 1 }],
    chores: [{ id: 'feed', name: 'Feed the cat', cat: 'pets', points: 1, time: '18:00', freq: { type: 'daily' }, who: [], start: '2026-11-01' }],
    assign: { 'feed|2026-11-09': 'a' },
    done: {},
    ...extra,
  };
}

// 18:01 in London on 9 Nov 2026 (GMT, so the same as UTC).
const JUST_AFTER = new Date('2026-11-09T18:01:00Z');

test('reads the wall clock in the household time zone', () => {
  const t = wallClock(new Date('2026-07-01T17:30:00Z'), 'Europe/London'); // BST
  assert.equal(t.getHours(), 18);
  assert.equal(t.getMinutes(), 30);
});

test('alerts a chore that has just come due', () => {
  const alerts = dueAlerts(household(), JUST_AFTER);
  assert.deepEqual(alerts.map((a) => [a.key, a.memberId]), [['feed|2026-11-09', 'a']]);
  assert.match(alerts[0].title, /Feed the cat/);
});

test('does not alert before the chore is due', () => {
  assert.equal(dueAlerts(household(), new Date('2026-11-09T17:59:00Z')).length, 0);
});

test('skips chores that are done or already alerted', () => {
  const done = { 'feed|2026-11-09': { by: 'a', at: 0, pts: 1, name: 'x' } };
  assert.equal(dueAlerts(household({ done }), JUST_AFTER).length, 0);
  assert.equal(dueAlerts(household({ alerted: { 'feed|2026-11-09': 1 } }), JUST_AFTER).length, 0);
});

test('gives up on alerts that are too late', () => {
  assert.equal(dueAlerts(household(), new Date('2026-11-09T18:50:00Z')).length, 0);
});

test('uses the household time zone, not the server one', () => {
  // 18:00 in New York is 23:00 UTC in November.
  const h = household({ timeZone: 'America/New_York' });
  assert.equal(dueAlerts(h, JUST_AFTER).length, 0);
  assert.equal(dueAlerts(h, new Date('2026-11-09T23:01:00Z')).length, 1);
});

test('still alerts a late-night chore just after midnight', () => {
  const h = household({
    chores: [{ id: 'bins', name: 'Bins', cat: 'outdoor', points: 1, time: '23:58', freq: { type: 'daily' }, who: [], start: '2026-11-01' }],
    assign: { 'bins|2026-11-09': 'a' },
  });
  assert.equal(dueAlerts(h, new Date('2026-11-10T00:03:00Z')).length, 1);
});

test('forgets alerts older than three days', () => {
  const now = new Date('2026-11-09T12:00:00Z');
  const h = household({ alerted: { old: now.getTime() - 4 * 86_400_000, recent: now.getTime() - 3600_000 } });
  assert.deepEqual(staleAlerted(h, now), ['old']);
});
