import { getApp, getApps, initializeApp } from 'firebase/app';
import { initializeFirestore, type Firestore } from 'firebase/firestore';

/** Filled from .env (see README). These values identify the project; they are not secrets. */
const config = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

export const firebaseConfigured = Boolean(config.apiKey && config.projectId && config.appId);

let db: Firestore | null = null;

export function getDb(): Firestore {
  if (!firebaseConfigured) throw new Error('Firebase is not set up. Copy .env.example to .env and fill it in.');
  if (!db) {
    const app = getApps().length ? getApp() : initializeApp(config);
    // React Native has no full WebChannel support; long polling keeps the live board working.
    db = initializeFirestore(app, { experimentalAutoDetectLongPolling: true });
  }
  return db;
}
