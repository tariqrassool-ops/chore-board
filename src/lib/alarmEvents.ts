import notifee, { EventType, type Notification } from 'react-native-notify-kit';
import { ACTION_DONE, ACTION_SNOOZE, dismiss, prepareAlarms, snooze } from './alarms';
import { finishFromAlarm } from './finish';

type OpenAlarm = (key: string, id: string) => void;

function open(n: Notification | undefined, onOpen: OpenAlarm) {
  const key = n?.data?.key;
  if (typeof key === 'string') onOpen(key, n?.id ?? '');
}

/** Opens the alarm screen when an alarm rings or is tapped, and handles its buttons while the app is open. */
export function subscribeAlarmEvents(onOpen: OpenAlarm): () => void {
  prepareAlarms().catch(() => {});
  // Opened by tapping an alarm, or by Android's full-screen alarm.
  notifee.getInitialNotification().then((initial) => open(initial?.notification, onOpen));
  return notifee.onForegroundEvent(async ({ type, detail }) => {
    const n = detail.notification;
    if (!n) return;
    if (type === EventType.DELIVERED || type === EventType.PRESS) open(n, onOpen);
    if (type === EventType.ACTION_PRESS && detail.pressAction?.id === ACTION_SNOOZE) await snooze(n);
    if (type === EventType.ACTION_PRESS && detail.pressAction?.id === ACTION_DONE) {
      await finishFromAlarm(n.data?.key as string | undefined);
      await dismiss(n);
    }
  });
}
