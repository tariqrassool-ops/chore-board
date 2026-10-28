// Background handlers must be registered before the app renders, so they live in the entry file.
import notifee, { EventType } from 'react-native-notify-kit';
import { ACTION_DONE, ACTION_SNOOZE, dismiss, snooze } from './src/lib/alarms';
import { finishFromAlarm } from './src/lib/finish';

notifee.onBackgroundEvent(async ({ type, detail }) => {
  const n = detail.notification;
  if (type !== EventType.ACTION_PRESS || !n) return;
  if (detail.pressAction?.id === ACTION_SNOOZE) await snooze(n);
  if (detail.pressAction?.id === ACTION_DONE) {
    await finishFromAlarm(n.data?.key as string | undefined);
    await dismiss(n);
  }
});

// Loaded after the handler is registered (a static import would be hoisted above it).
require('expo-router/entry');
