# Chore Board

A shared daily chore board for the household. Chores are shared out fairly by effort points, and each person's phone alerts them when one of their chores is due, even if the phone is locked or another app is open.

- **Android:** the Chore Board app. It sets a full-screen alarm with sound that keeps ringing until it's marked done, snoozed or dismissed, like the Clock app.
- **iPhone:** the same board as a web app added to the home screen from Safari (iOS 16.4 or later). Alerts arrive as notifications with sound on the lock screen and over other apps, sent by a small server task within about two minutes of the chore's time. No App Store or Apple developer account is needed.

## How chores are shared

Every chore has effort points from 1 (quick, like feeding the cat) to 5 (huge, like a deep clean). For the next two weeks, each chore goes to whoever has the fewest points for their share, counting what they finished in the last four weeks. People can be on a full share, a half share (a child, say) or away. Nobody gets the same chore twice in a row if someone else can take it. Anyone can hand a chore to someone else from the board, and "Re-deal all open chores" starts the next two weeks fresh.

The logic is in [`src/lib/schedule.ts`](src/lib/schedule.ts) with tests in `schedule.test.ts`.

## One-time setup

### 1. Create the Firebase project

Firebase holds the shared board, hosts the web board and sends the iPhone alerts.

1. Go to <https://console.firebase.google.com>, choose **Create a project**, and give it any name. Google Analytics isn't needed.
2. Open **Build › Firestore Database**, choose **Create database**, pick a location near you, and start in **production mode**.
3. Open **Project settings** (the gear), scroll to **Your apps**, and add a **Web app** (the `</>` button). Copy the values from the config it shows.
4. In **Project settings › Cloud Messaging › Web Push certificates**, choose **Generate key pair** and copy the key.
5. Copy `.env.example` to `.env` and paste each value in, including the key from step 4 as `EXPO_PUBLIC_FIREBASE_VAPID_KEY`. These values identify the project and are safe to keep in the app.
6. Switch the project to the **Blaze (pay as you go)** plan (the plan name at the bottom left of the console). The alert server needs it, but a household's use stays inside the free allowance, so it should cost nothing. Set a budget alert of £1 when asked so you'd hear about any charge.

### 2. Put the web board and alert server online

```bash
npm install
npx firebase-tools@latest login
npx firebase-tools@latest use --add      # pick the project from step 1
npm run deploy                           # web board, alert server and database rules
```

The command prints the board's web address (`https://<project>.web.app`). iPhones open this in Safari.

### 3. Build the Android app

Builds run on Expo's servers, so no Android Studio is needed. You need a free account at <https://expo.dev>.

```bash
npx eas-cli@latest login
npx eas-cli@latest init                  # links the project to your Expo account
# Add each value from .env under Environment variables in the Expo dashboard (preview environment), then:
npm run build:android                    # gives a download link for an .apk
```

Open the build link on each Android phone, download the APK and install it (allow "Install unknown apps" when asked).

### 4. On each phone

1. **Android:** open the Chore Board app. **iPhone:** open the board's web address in Safari, tap **Share › Add to Home Screen**, then open Chore Board from the home screen.
2. The first person chooses **Start a new household**. Everyone else chooses **Join one** and enters the code from **Alarms & sharing** on the first phone.
3. Pick who you are. The phone only alerts for that person's chores.
4. In **Alarms & sharing**, turn alerts on and use the test button to check.

Android settings worth checking:
- **Full screen notifications** must be on for Chore Board (Settings › Apps › Chore Board › Notifications, or Settings › Apps › Special app access › Full screen notifications on Android 14+).
- Turn off **battery optimisation** for Chore Board so alarms aren't delayed.

iPhone settings worth checking:
- The ring/silent switch must be on to hear the alert. If you use a Focus mode, allow Chore Board under Settings › Focus.

## Development

```bash
npm run typecheck
npm test
npx expo start                   # needs a development build: npx eas-cli@latest build --profile development
```

The app uses Expo Router (`src/app`), Firebase Firestore for the shared board (one document per household, `households/<code>`), and [react-native-notify-kit](https://github.com/marcocrupi/react-native-notify-kit), the maintained fork of Notifee, for alarms. It won't run in Expo Go because it uses native alarm code.

- **Android app:** each phone schedules its own alarms locally for the next 7 days and refreshes them whenever the board changes or the app is opened, so alarms ring even with no internet. Open the app at least once a week to keep them topped up.
- **Web board (iPhone):** the same code built for the web (`npm run build:web`). Files ending `.web.ts` replace their native versions there. Each browser registers under `households/<code>/devices` once alerts are on, and `public/sw.js` shows the pushes.
- **Alert server (`functions/`):** a Cloud Function that runs every 2 minutes, finds chores that have just come due in each household's time zone, and pushes to that person's registered browsers. It reuses `src/lib/schedule.ts`. Test it with `npm --prefix functions test`.
