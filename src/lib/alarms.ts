import { Platform } from 'react-native';
import notifee, {
  AlarmType,
  AndroidCategory,
  AndroidImportance,
  AndroidVisibility,
  AuthorizationStatus,
  TriggerType,
  type Notification,
} from 'react-native-notify-kit';
import { dueAt, occurrences, startOfDay } from './schedule';
import type { Household } from './types';

export const CHANNEL_ID = 'chore-alarms';
export const IOS_CATEGORY = 'chore';
export const ACTION_DONE = 'done';
export const ACTION_SNOOZE = 'snooze';
export const SNOOZE_MINUTES = 10;

/** How far ahead alarms are set. iOS keeps at most 64 pending, so stay well under. */
const ALARM_DAYS = 7;
const MAX_ALARMS = 48;

let prepared = false;

/** Create the Android alarm channel and the iOS action buttons. Safe to call repeatedly. */
export async function prepareAlarms(): Promise<void> {
  if (prepared) return;
  if (Platform.OS === 'android') {
    await notifee.createChannel({
      id: CHANNEL_ID,
      name: 'Chore alarms',
      description: 'Rings when one of your chores is due.',
      importance: AndroidImportance.HIGH,
      visibility: AndroidVisibility.PUBLIC,
      sound: 'default',
      vibration: true,
      vibrationPattern: [400, 600, 400, 600],
      bypassDnd: true,
    });
  } else {
    await notifee.setNotificationCategories([
      {
        id: IOS_CATEGORY,
        actions: [
          { id: ACTION_DONE, title: 'Done' },
          { id: ACTION_SNOOZE, title: `Snooze ${SNOOZE_MINUTES} min` },
        ],
      },
    ]);
  }
  prepared = true;
}

export interface AlarmPermissions {
  notifications: boolean;
  /** Android 12+: exact timing. Always true on iOS. */
  exactAlarms: boolean;
}

export async function requestAlarmPermissions(): Promise<AlarmPermissions> {
  const settings = await notifee.requestPermission({ sound: true, alert: true, badge: false });
  return readPermissions(settings.authorizationStatus);
}

export async function checkAlarmPermissions(): Promise<AlarmPermissions> {
  const settings = await notifee.getNotificationSettings();
  return readPermissions(settings.authorizationStatus, settings.android?.alarm);
}

function readPermissions(status: AuthorizationStatus, alarm?: number): AlarmPermissions {
  return {
    notifications: status === AuthorizationStatus.AUTHORIZED || status === AuthorizationStatus.PROVISIONAL,
    // AndroidNotificationSetting.ENABLED is 1; undefined on iOS.
    exactAlarms: Platform.OS !== 'android' || alarm === undefined || alarm === 1,
  };
}

export const openExactAlarmSettings = () => notifee.openAlarmPermissionSettings();
export const openNotificationSettings = () => notifee.openNotificationSettings(CHANNEL_ID);

/** The notification shown when a chore is due. */
export function alarmNotification(id: string, title: string, body: string, data: Record<string, string>): Notification {
  return {
    id,
    title,
    body,
    data,
    android: {
      channelId: CHANNEL_ID,
      category: AndroidCategory.ALARM,
      importance: AndroidImportance.HIGH,
      visibility: AndroidVisibility.PUBLIC,
      // Rings until someone acts on it, like the Clock app.
      loopSound: true,
      ongoing: true,
      autoCancel: false,
      // Pops up full screen over the lock screen and other apps.
      fullScreenAction: { id: 'default' },
      pressAction: { id: 'default' },
      actions: [
        { title: 'Done', pressAction: { id: ACTION_DONE } },
        { title: `Snooze ${SNOOZE_MINUTES} min`, pressAction: { id: ACTION_SNOOZE } },
      ],
    },
    ios: {
      categoryId: IOS_CATEGORY,
      sound: 'default',
      // Shows on the lock screen and through Focus modes that allow time-sensitive alerts.
      interruptionLevel: 'timeSensitive',
      foregroundPresentationOptions: { banner: true, list: true, sound: true, badge: false },
    },
  };
}

async function scheduleAt(when: number, n: Notification) {
  await notifee.createTriggerNotification(n, {
    type: TriggerType.TIMESTAMP,
    timestamp: when,
    // SET_ALARM_CLOCK fires on time even in Doze, the same as an alarm clock app.
    alarmManager: { type: AlarmType.SET_ALARM_CLOCK },
  });
}

/**
 * Replace this phone's alarms with one per upcoming chore assigned to `memberId`.
 * Each phone only rings for its own person.
 */
export async function syncAlarms(h: Household, memberId: string | null, now = new Date()): Promise<number> {
  await prepareAlarms();
  const existing = await notifee.getTriggerNotificationIds();
  const ours = existing.filter((id) => id.startsWith('chore:'));
  if (ours.length) await notifee.cancelTriggerNotifications(ours);
  if (!memberId) return 0;

  const upcoming = occurrences(h, startOfDay(now), ALARM_DAYS)
    .filter((o) => !h.done[o.key] && h.assign[o.key] === memberId)
    .map((o) => ({ o, at: dueAt(o.date, o.time).getTime() }))
    .filter(({ at }) => at > now.getTime() + 5000)
    .slice(0, MAX_ALARMS);

  for (const { o, at } of upcoming) {
    await scheduleAt(
      at,
      alarmNotification(`chore:${o.key}`, `Time for: ${o.chore.name}`, `Due now (${o.time}). Tap Done when it's finished.`, {
        key: o.key,
      }),
    );
  }
  return upcoming.length;
}

export async function snooze(n: Notification): Promise<void> {
  await prepareAlarms();
  if (n.id) await notifee.cancelNotification(n.id);
  const when = Date.now() + SNOOZE_MINUTES * 60_000;
  await scheduleAt(when, alarmNotification(`snooze:${n.data?.key ?? when}`, n.title ?? 'Chore', n.body ?? '', (n.data ?? {}) as Record<string, string>));
}

export async function dismiss(n: Notification): Promise<void> {
  if (n.id) await notifee.cancelNotification(n.id);
}

/** Ring once, 10 seconds from now, so people can check their phone settings. */
export async function testAlarm(): Promise<void> {
  await prepareAlarms();
  await scheduleAt(
    Date.now() + 10_000,
    alarmNotification('test:alarm', 'Test alarm', 'This is what a chore alarm looks and sounds like.', {}),
  );
}
