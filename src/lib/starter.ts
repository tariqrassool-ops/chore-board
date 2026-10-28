import { dateKey } from './schedule';
import type { Chore } from './types';

/** Common chores a new household starts with. Everything can be edited or deleted. */
export function starterChores(idFor: () => string, today = new Date()): Chore[] {
  const start = dateKey(today);
  const c = (name: string, cat: Chore['cat'], points: number, time: string, freq: Chore['freq']): Chore => ({
    id: idFor(),
    name,
    cat,
    points,
    time,
    freq,
    who: [],
    start,
  });
  return [
    c('Feed the pets (morning)', 'pets', 1, '07:30', { type: 'daily' }),
    c('Feed the pets (evening)', 'pets', 1, '18:00', { type: 'daily' }),
    c('Wash up and wipe the kitchen', 'kitchen', 2, '20:00', { type: 'daily' }),
    c('Weekly grocery shop', 'groceries', 4, '10:00', { type: 'weekly', days: [6] }),
    c('Hoover the house', 'cleaning', 3, '11:00', { type: 'weekly', days: [0, 3] }),
    c('Clean the bathroom', 'cleaning', 3, '11:00', { type: 'weekly', days: [6] }),
    c('Laundry: wash, dry, fold', 'laundry', 3, '09:00', { type: 'every', n: 3 }),
    c('Take the bins out', 'outdoor', 1, '20:30', { type: 'weekly', days: [2] }),
  ];
}
