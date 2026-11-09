// Handles the Done and Snooze buttons on an alarm while the app is closed (Android and iOS).
import notifee, { EventType } from 'react-native-notify-kit';
import { ACTION_DONE, ACTION_SNOOZE, dismiss, snooze } from './alarms';
import { finishFromAlarm } from './finish';

notifee.onBackgroundEvent(async ({ type, detail }) => {
  const n = detail.notification;
  if (type !== EventType.ACTION_PRESS || !n) return;
  if (detail.pressAction?.id === ACTION_SNOOZE) await snooze(n);
  if (detail.pressAction?.id === ACTION_DONE) {
    await finishFromAlarm(n.data?.key as string | undefined);
    await dismiss(n);
  }
});
