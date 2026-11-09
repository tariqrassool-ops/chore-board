// Web push for the home-screen web app (used on iPhones). Only imported by *.web.ts files.
import { getApp } from 'firebase/app';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { getMessaging, getToken, isSupported, type Messaging } from 'firebase/messaging';
import { firebaseConfigured, getDb } from './firebase';

const VAPID_KEY = process.env.EXPO_PUBLIC_FIREBASE_VAPID_KEY;

let messaging: Promise<Messaging | null> | null = null;
/** The last registration written, so board updates don't rewrite it every time. */
let lastRegistered = '';

/** Firebase Messaging, or null where this browser can't receive pushes. */
export function webMessaging(): Promise<Messaging | null> {
  if (!messaging) {
    messaging = (async () => {
      if (!firebaseConfigured || typeof window === 'undefined' || !('serviceWorker' in navigator)) return null;
      if (!(await isSupported())) return null;
      getDb(); // initialises the Firebase app
      return getMessaging(getApp());
    })().catch(() => null);
  }
  return messaging;
}

/**
 * The service worker once it is active. `register()` can resolve while the worker is still
 * installing (on a first visit, for example), and showing a notification or getting a push
 * token then fails, so wait for `ready`.
 */
export async function serviceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return null;
  try {
    await navigator.serviceWorker.register('/sw.js');
    return await navigator.serviceWorker.ready;
  } catch {
    return null;
  }
}

/** iPhones only allow web alerts once the page has been added to the home screen. */
export function isIos(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia?.('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true;
}

export function notificationPermission(): NotificationPermission | 'unsupported' {
  return typeof Notification === 'undefined' ? 'unsupported' : Notification.permission;
}

/**
 * Register this browser to receive alerts for `memberId`. The server looks up
 * households/<id>/devices to find who to alert, so each device stores its owner.
 */
export async function registerDevice(householdId: string, memberId: string): Promise<boolean> {
  if (notificationPermission() !== 'granted' || !VAPID_KEY) return false;
  const [m, reg] = await Promise.all([webMessaging(), serviceWorker()]);
  if (!m || !reg) return false;
  const token = await getToken(m, { vapidKey: VAPID_KEY, serviceWorkerRegistration: reg });
  if (!token) return false;
  const signature = `${householdId}|${memberId}|${token}`;
  if (signature === lastRegistered) return true;
  await setDoc(doc(getDb(), 'households', householdId, 'devices', deviceId(token)), {
    token,
    memberId,
    platform: 'web',
    updatedAt: serverTimestamp(),
  });
  lastRegistered = signature;
  return true;
}

/** Firestore ids can't contain "/"; tokens rarely do, but be safe and keep them short enough. */
function deviceId(token: string): string {
  return token.replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 400);
}

export const vapidConfigured = Boolean(VAPID_KEY);
