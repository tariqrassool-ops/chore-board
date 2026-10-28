import type { Chore } from './types';

export const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
/** Monday-first order of getDay() numbers. */
export const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];

export function repeatText(c: Chore): string {
  if (c.freq.type === 'daily') return 'Every day';
  if (c.freq.type === 'every') return `Every ${c.freq.n} days`;
  const days = c.freq.days;
  return days.length === 7 ? 'Every day' : WEEK_ORDER.filter((d) => days.includes(d)).map((d) => DAY_NAMES[d]).join(', ');
}
