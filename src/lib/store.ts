import {
  deleteField,
  doc,
  FieldPath,
  getDoc,
  onSnapshot,
  setDoc,
  updateDoc,
  type DocumentReference,
} from 'firebase/firestore';
import { getDb } from './firebase';
import { openFutureKeys, plan } from './schedule';
import { emptyHousehold, type Chore, type DoneRecord, type Household, type Member } from './types';

const ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789';

/** A random id. Household codes are the only thing protecting a household, so they are long. */
export function randomId(length = 10): string {
  const bytes = new Uint8Array(length);
  const c = (globalThis as { crypto?: { getRandomValues?: (a: Uint8Array) => Uint8Array } }).crypto;
  if (c?.getRandomValues) c.getRandomValues(bytes);
  else for (let i = 0; i < length; i++) bytes[i] = Math.floor(Math.random() * 256);
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join('');
}

const ref = (householdId: string) => doc(getDb(), 'households', householdId) as DocumentReference<Household>;

export function normalize(data: Partial<Household> | undefined): Household {
  const h = emptyHousehold();
  if (!data) return h;
  return {
    name: data.name || h.name,
    members: Array.isArray(data.members) ? data.members : [],
    chores: Array.isArray(data.chores) ? data.chores : [],
    assign: data.assign ?? {},
    done: data.done ?? {},
  };
}

export function subscribe(householdId: string, onData: (h: Household | null) => void, onError: (e: Error) => void) {
  return onSnapshot(
    ref(householdId),
    (snap) => onData(snap.exists() ? normalize(snap.data()) : null),
    onError,
  );
}

export async function householdExists(householdId: string): Promise<boolean> {
  return (await getDoc(ref(householdId))).exists();
}

export async function createHousehold(name: string, firstMember: Member, starterChores: Chore[]): Promise<string> {
  const id = randomId(12);
  const h: Household = { ...emptyHousehold(name), members: [firstMember], chores: starterChores };
  h.assign = plan(h, new Date());
  await setDoc(ref(id), h);
  return id;
}

/** Write a set of field changes in one update. `undefined` deletes the field. */
async function writeFields(householdId: string, changes: [FieldPath, unknown][]) {
  if (!changes.length) return;
  const flat = changes.flatMap(([path, value]) => [path, value === undefined ? deleteField() : value]);
  const [first, firstValue, ...rest] = flat;
  await updateDoc(ref(householdId), first as FieldPath, firstValue, ...rest);
}

const assignPath = (key: string) => new FieldPath('assign', key);
const donePath = (key: string) => new FieldPath('done', key);

/** Fill any gaps in the next two weeks. Call after loading and after any change to people or chores. */
export async function topUp(householdId: string, h: Household): Promise<void> {
  const added = plan(h, new Date());
  await writeFields(
    householdId,
    Object.entries(added).map(([k, v]) => [assignPath(k), v]),
  );
}

/** Re-deal every open chore from today on. */
export async function rebalance(householdId: string, h: Household): Promise<void> {
  const removed = openFutureKeys(h, new Date());
  const cleared: Household = { ...h, assign: { ...h.assign } };
  for (const k of removed) delete cleared.assign[k];
  const added = plan(cleared, new Date());
  const changes: [FieldPath, unknown][] = removed.filter((k) => !(k in added)).map((k) => [assignPath(k), undefined]);
  for (const [k, v] of Object.entries(added)) changes.push([assignPath(k), v]);
  await writeFields(householdId, changes);
}

export async function markDone(householdId: string, key: string, rec: DoneRecord | null): Promise<void> {
  await writeFields(householdId, [[donePath(key), rec ?? undefined]]);
}

export async function reassign(householdId: string, key: string, memberId: string): Promise<void> {
  await writeFields(householdId, [[assignPath(key), memberId]]);
}

export async function saveMembers(householdId: string, members: Member[]): Promise<void> {
  await updateDoc(ref(householdId), { members });
}

export async function saveChores(householdId: string, chores: Chore[], dropKeysFor: string[] = []): Promise<void> {
  // Edited or deleted chores lose their open future assignments so they get re-dealt.
  await updateDoc(ref(householdId), { chores });
  if (!dropKeysFor.length) return;
  const snap = await getDoc(ref(householdId));
  const h = normalize(snap.data());
  const today = new Date();
  const keys = openFutureKeys(h, today).filter((k) => dropKeysFor.some((id) => k.startsWith(id + '|')));
  await writeFields(householdId, keys.map((k) => [assignPath(k), undefined]));
}

export async function renameHousehold(householdId: string, name: string): Promise<void> {
  await updateDoc(ref(householdId), { name });
}
