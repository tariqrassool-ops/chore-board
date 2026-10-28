import { router, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import notifee, { EventType, type Notification } from 'react-native-notify-kit';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ACTION_DONE, ACTION_SNOOZE, dismiss, prepareAlarms, snooze } from '../lib/alarms';
import { finishFromAlarm } from '../lib/finish';
import { HouseholdProvider } from '../lib/HouseholdContext';
import { useTheme } from '../ui/theme';

function openAlarm(n: Notification | undefined) {
  const key = n?.data?.key;
  if (typeof key === 'string') router.push({ pathname: '/alarm', params: { key, id: n?.id ?? '' } });
}

export default function RootLayout() {
  const t = useTheme();

  useEffect(() => {
    prepareAlarms().catch(() => {});
    // Opened by tapping an alarm, or by Android's full-screen alarm.
    notifee.getInitialNotification().then((initial) => openAlarm(initial?.notification));
    return notifee.onForegroundEvent(async ({ type, detail }) => {
      const n = detail.notification;
      if (!n) return;
      if (type === EventType.DELIVERED || type === EventType.PRESS) openAlarm(n);
      if (type === EventType.ACTION_PRESS && detail.pressAction?.id === ACTION_SNOOZE) await snooze(n);
      if (type === EventType.ACTION_PRESS && detail.pressAction?.id === ACTION_DONE) {
        await finishFromAlarm(n.data?.key as string | undefined);
        await dismiss(n);
      }
    });
  }, []);

  return (
    <SafeAreaProvider>
      <HouseholdProvider>
        <StatusBar style="auto" />
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: t.bg },
            headerTintColor: t.fg,
            headerShadowVisible: false,
            contentStyle: { backgroundColor: t.bg },
          }}
        >
          <Stack.Screen name="index" options={{ title: 'Today' }} />
          <Stack.Screen name="setup" options={{ title: 'Set up', headerBackVisible: false }} />
          <Stack.Screen name="manage" options={{ title: 'People & chores' }} />
          <Stack.Screen name="chore" options={{ title: 'Chore', presentation: 'modal' }} />
          <Stack.Screen name="settings" options={{ title: 'Alarms & sharing' }} />
          <Stack.Screen name="alarm" options={{ headerShown: false, presentation: 'fullScreenModal', gestureEnabled: false }} />
        </Stack>
      </HouseholdProvider>
    </SafeAreaProvider>
  );
}
