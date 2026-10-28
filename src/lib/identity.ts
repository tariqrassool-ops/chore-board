import AsyncStorage from '@react-native-async-storage/async-storage';

const HOUSEHOLD = 'chore-board.household';
const MEMBER = 'chore-board.member';

export interface Identity {
  householdId: string | null;
  memberId: string | null;
}

export async function loadIdentity(): Promise<Identity> {
  const [[, householdId], [, memberId]] = await AsyncStorage.multiGet([HOUSEHOLD, MEMBER]);
  return { householdId, memberId };
}

export async function saveIdentity({ householdId, memberId }: Identity): Promise<void> {
  if (householdId) await AsyncStorage.setItem(HOUSEHOLD, householdId);
  else await AsyncStorage.removeItem(HOUSEHOLD);
  if (memberId) await AsyncStorage.setItem(MEMBER, memberId);
  else await AsyncStorage.removeItem(MEMBER);
}
