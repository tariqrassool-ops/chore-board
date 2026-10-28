import { doc, getDoc } from 'firebase/firestore';
import { firebaseConfigured, getDb } from './firebase';
import { loadIdentity } from './identity';
import { markDone } from './store';

/** Mark a chore done from an alarm's Done button, crediting the person whose phone it is. */
export async function finishFromAlarm(key: string | undefined): Promise<void> {
  if (!key || !firebaseConfigured) return;
  const { householdId, memberId } = await loadIdentity();
  if (!householdId || !memberId) return;
  const snap = await getDoc(doc(getDb(), 'households', householdId));
  const chores = (snap.data()?.chores ?? []) as { id: string; name: string; points: number }[];
  const chore = chores.find((c) => key.startsWith(c.id + '|'));
  await markDone(householdId, key, { by: memberId, at: Date.now(), pts: chore?.points ?? 1, name: chore?.name ?? '' });
}
