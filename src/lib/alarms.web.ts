// Web version of ./alarms: alerts come from the server as web pushes (see functions/),
// so this phone only has to ask permission and register itself.
import { dueAt, occurrences, startOfDay } from './schedule';
import type { Household } from './types';
import { isIos, isStandalone, notificationPermission, registerDevice, serviceWorker, vapidConfigured } from './webPush';

export const SNOOZE_MINUTES = 10;
/** Snoozing needs the phone to ring again later, which the web can't schedule itself. */
export const supportsSnooze = false;

export interface AlarmPermissions {
  notifications: boolean;
  exactAlarms: boolean;
  needsHomeScreen?: boolean;
}

export async function prepareAlarms(): Promise<void> {
  await serviceWorker();
}

export async function checkAlarmPermissions(): Promise<AlarmPermissions> {
  return {
    notifications: vapidConfigured && notificationPermission() === 'granted',
    exactAlarms: true,
    needsHomeScreen: isIos() && !isStandalone(),
  };
}

/** Must be called from a tap: iPhones only show the permission prompt in response to one. */
export async function requestAlarmPermissions(): Promise<AlarmPermissions> {
  if (notificationPermission() === 'default') await Notification.requestPermission();
  return checkAlarmPermissions();
}

export async function openExactAlarmSettings(): Promise<void> {}
export async function openNotificationSettings(): Promise<void> {}

/** Registers this device for its person's alerts. Returns how many alerts are coming in the next 7 days. */
export async function syncAlarms(h: Household, householdId: string, memberId: string | null, now = new Date()): Promise<number> {
  if (!memberId) return 0;
  const registered = await registerDevice(householdId, memberId).catch(() => false);
  if (!registered) return 0;
  return occurrences(h, startOfDay(now), 7).filter(
    (o) => !h.done[o.key] && h.assign[o.key] === memberId && dueAt(o.date, o.time) > now,
  ).length;
}

/** Shows an alert straight away, so people can check alerts are allowed and how they look. */
export async function testAlarm(): Promise<void> {
  const reg = await serviceWorker();
  if (!reg) throw new Error('This browser could not start the alert service. Reload the page and try again.');
  await reg.showNotification('Test alert', {
    body: 'This is what a chore alert looks like.',
    // A new tag each time, so a second test shows again instead of silently replacing the first.
    tag: `test-${Date.now()}`,
    requireInteraction: true,
    icon: '/icon-192.png',
    badge: '/icon-192.png',
  });
}

export async function cancelAlarm(_id?: string): Promise<void> {}
export async function snoozeChore(_key: string, _title: string): Promise<void> {}
