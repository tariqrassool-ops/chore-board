// Sends web-push alerts to phones using the home-screen web board (iPhones).
// Run on a schedule by .github/workflows/alerts.yml; each run checks once and exits.
// Android phones running the app set their own alarms and don't need this.
import { cert, initializeApp } from 'firebase-admin/app';
import { FieldPath, FieldValue, getFirestore } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';
import { dueAlerts, staleAlerted } from './alerts';
import type { Household } from './shared/types';

/** Tokens that will never work again, so their device records can be removed. */
const DEAD_TOKEN_CODES = new Set(['messaging/registration-token-not-registered', 'messaging/invalid-registration-token']);

async function main() {
  const key = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!key) throw new Error('FIREBASE_SERVICE_ACCOUNT is not set. Add the service account key as a repository secret (see README).');
  initializeApp({ credential: cert(JSON.parse(key)) });

  const db = getFirestore();
  const now = new Date();
  const households = await db.collection('households').get();
  let sent = 0;

  for (const snap of households.docs) {
    const h = snap.data() as Household;
    if (!h.chores || !h.assign) continue;
    const alerts = dueAlerts({ ...h, done: h.done ?? {} }, now);
    const stale = staleAlerted(h, now);
    if (!alerts.length && !stale.length) continue;

    const updates: unknown[] = [];
    for (const alert of alerts) {
      const devices = await snap.ref.collection('devices').where('memberId', '==', alert.memberId).get();
      if (!devices.empty) {
        const res = await getMessaging().sendEachForMulticast({
          tokens: devices.docs.map((d) => d.get('token') as string),
          // Data-only, so public/sw.js decides how the alert looks (sticky, with sound, tap opens the alarm screen).
          data: { key: alert.key, title: alert.title, body: alert.body },
          webpush: { headers: { Urgency: 'high', TTL: String(15 * 60) } },
        });
        await Promise.all(
          res.responses.map((r, i) =>
            !r.success && r.error && DEAD_TOKEN_CODES.has(r.error.code) ? devices.docs[i].ref.delete() : null,
          ),
        );
        sent += res.successCount;
        console.log(`${alert.key}: sent to ${res.successCount}, failed ${res.failureCount}`);
      }
      // When it was last sent, so the next one waits REPEAT_MINUTES. Recorded even with no devices.
      updates.push(new FieldPath('alerted', alert.key), now.getTime());
    }
    for (const k of stale) updates.push(new FieldPath('alerted', k), FieldValue.delete());

    const [field, value, ...rest] = updates;
    await snap.ref.update(field as FieldPath, value, ...rest);
  }
  console.log(`Checked ${households.size} households, sent ${sent} alerts.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
