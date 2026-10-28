export type Category =
  | 'groceries'
  | 'pets'
  | 'kitchen'
  | 'cleaning'
  | 'laundry'
  | 'outdoor'
  | 'admin'
  | 'other';

export const CATEGORY_LABELS: Record<Category, string> = {
  groceries: 'Groceries',
  pets: 'Pets',
  kitchen: 'Kitchen',
  cleaning: 'Cleaning',
  laundry: 'Laundry',
  outdoor: 'Bins & outdoor',
  admin: 'Bills & admin',
  other: 'Other',
};

export type Frequency =
  | { type: 'daily' }
  | { type: 'weekly'; days: number[] } // 0 = Sunday … 6 = Saturday
  | { type: 'every'; n: number }; // every n days from `start`

export interface Member {
  id: string;
  name: string;
  color: number;
  /** 1 = full share, 0.5 = half share. */
  share: number;
  /** Away members get no new chores. */
  paused?: boolean;
}

export interface Chore {
  id: string;
  name: string;
  cat: Category;
  /** Effort points, 1 (quick) to 5 (huge). */
  points: number;
  /** "HH:MM", 24-hour, local time. */
  time: string;
  freq: Frequency;
  /** Members allowed to do it. Empty means everyone. */
  who: string[];
  /** "YYYY-MM-DD" the chore starts from. */
  start: string;
}

export interface DoneRecord {
  by: string;
  at: number;
  pts: number;
  name: string;
}

/** The whole household lives in one Firestore document. */
export interface Household {
  name: string;
  members: Member[];
  chores: Chore[];
  /** occurrence key ("choreId|YYYY-MM-DD") -> member id */
  assign: Record<string, string>;
  /** occurrence key -> who did it */
  done: Record<string, DoneRecord>;
}

export interface Occurrence {
  key: string;
  chore: Chore;
  date: string;
  time: string;
}

export function emptyHousehold(name = 'Our home'): Household {
  return { name, members: [], chores: [], assign: {}, done: {} };
}
