import { router, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { subscribeAlarmEvents } from '../lib/alarmEvents';
import { HouseholdProvider } from '../lib/HouseholdContext';
import { useTheme } from '../ui/theme';

export default function RootLayout() {
  const t = useTheme();

  useEffect(
    () => subscribeAlarmEvents((key, id) => router.push({ pathname: '/alarm', params: { key, id } })),
    [],
  );

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
