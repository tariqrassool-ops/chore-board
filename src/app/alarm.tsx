import { router, useLocalSearchParams } from 'expo-router';
import { Text, View } from 'react-native';
import notifee from 'react-native-notify-kit';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { alarmNotification, snooze, SNOOZE_MINUTES } from '../lib/alarms';
import { useHousehold } from '../lib/HouseholdContext';
import { splitKey } from '../lib/schedule';
import { markDone } from '../lib/store';
import { Button } from '../ui/components';
import { useTheme } from '../ui/theme';

/** The full-screen alarm, opened when a chore alarm goes off. */
export default function Alarm() {
  const { key, id } = useLocalSearchParams<{ key: string; id?: string }>();
  const { household, householdId, memberId } = useHousehold();
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { choreId } = splitKey(key ?? '|');
  const chore = household?.chores.find((c) => c.id === choreId);
  const owner = household?.members.find((m) => m.id === (household.assign[key] ?? memberId));

  const close = async () => {
    if (id) await notifee.cancelNotification(id);
    if (router.canGoBack()) router.back();
    else router.replace('/');
  };

  const done = async () => {
    if (householdId && key && chore) {
      await markDone(householdId, key, { by: memberId ?? owner?.id ?? '', at: Date.now(), pts: chore.points, name: chore.name });
    }
    await close();
  };

  const later = async () => {
    await snooze(alarmNotification(id ?? '', `Time for: ${chore?.name ?? 'your chore'}`, 'Snoozed reminder.', { key }));
    await close();
  };

  return (
    <View style={{ flex: 1, backgroundColor: t.fg, padding: 24, paddingTop: 48 + insets.top, paddingBottom: 24 + insets.bottom, justifyContent: 'space-between' }}>
      <View style={{ gap: 10 }}>
        <Text style={{ color: t.bg, opacity: 0.7, fontWeight: '800', letterSpacing: 1 }}>CHORE TIME{owner ? ` · ${owner.name.toUpperCase()}` : ''}</Text>
        <Text style={{ color: t.bg, fontSize: 40, fontWeight: '900', lineHeight: 46 }}>{chore?.name ?? 'Your chore is due'}</Text>
        {chore && <Text style={{ color: t.bg, opacity: 0.8, fontSize: 18 }}>Due at {chore.time}</Text>}
      </View>
      <View style={{ gap: 12 }}>
        <Button kind="primary" big label="Done" onPress={done} />
        <Button big label={`Snooze ${SNOOZE_MINUTES} minutes`} onPress={later} />
        <Button kind="ghost" label="Dismiss" onPress={close} />
      </View>
    </View>
  );
}
