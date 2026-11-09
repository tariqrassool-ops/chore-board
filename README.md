# Chore Board

A shared daily chore board for the household. Chores are shared out fairly by effort points, and each person's phone alerts them when one of their chores is due, even if the phone is locked or another app is open.

- **Android:** the Chore Board app. It sets a full-screen alarm with sound that keeps ringing until it's marked done, snoozed or dismissed, like the Clock app.
- **iPhone:** the same board as a web app added to the home screen from Safari (iOS 16.4 or later). Alerts arrive as notifications with sound on the lock screen and over other apps. A GitHub scheduled job sends them, usually within 5 to 15 minutes of the chore's time. No App Store or Apple developer account is needed.

Everything runs on free plans: Firebase's free Spark plan and GitHub Actions on a public repository.

## How chores are shared

Every chore has effort points from 1 (quick, like feeding the cat) to 5 (huge, like a deep clean). For the next two weeks, each chore goes to whoever has the fewest points for their share, counting what they finished in the last four weeks. People can be on a full share, a half share (a child, say) or away. Nobody gets the same chore twice in a row if someone else can take it. Anyone can hand a chore to someone else from the board, and "Re-deal all open chores" starts the next two weeks fresh.

The logic is in [`src/lib/schedule.ts`](src/lib/schedule.ts) with tests in `schedule.test.ts`.

## One-time setup

### 1. Create the Firebase project (free Spark plan)

Firebase holds the shared board, hosts the web board and delivers the iPhone alerts.

1. Go to <https://console.firebase.google.com>, choose **Create a project**, and give it any name. Google Analytics isn't needed. Stay on the free Spark plan.
2. Open **Build › Firestore Database**, choose **Create database**, pick a location near you, and start in **production mode**.
3. Open **Project settings** (the gear), scroll to **Your apps**, and add a **Web app** (the `</>` button). Copy the values from the config it shows.
4. In **Project settings › Cloud Messaging › Web Push certificates**, choose **Generate key pair** and copy the key.
5. Put the values from steps 3 and 4 in `.env.production` (same names as `.env.example`) and commit it. These values identify the project; they are not passwords and are safe in a public repository.

### 2. Make the repository public

GitHub Actions is only free without limits on public repositories, and the iPhone alerts run there. On GitHub: **Settings › General › Danger Zone › Change visibility › Public**. Nothing private is in the repository: the Firebase key in the next step is stored as an encrypted secret, and household data lives in Firebase.

### 3. Give GitHub the Firebase key

1. In Firebase, **Project settings › Service accounts › Generate new private key**. A `.json` file downloads.
2. On GitHub, **Settings › Secrets and variables › Actions › New repository secret**. Name it `FIREBASE_SERVICE_ACCOUNT` and paste the whole contents of the file. Then delete the file.
3. Run **Actions › Deploy web board › Run workflow**. When it finishes, the board is at `https://<project-id>.web.app`. If it fails with a permission error, open <https://console.cloud.google.com/iam-admin/iam>, find the `firebase-adminsdk` account, and add the **Firebase Admin** role.

From then on, every change to `main` redeploys the board, and **Chore alerts** runs about every 5 minutes. GitHub pauses scheduled jobs in a repository with no activity for 60 days and emails you first; re-enable it under **Actions › Chore alerts**.

### 4. Build the Android app

Builds run on Expo's free build service from a GitHub job, so nothing needs installing on a computer.

1. Make a free account at <https://expo.dev>.
2. On expo.dev, open your account menu › **Account settings › Access tokens**, choose **Create token**, name it `github`, and copy it.
3. On GitHub, **Settings › Secrets and variables › Actions › New repository secret**. Name it `EXPO_TOKEN` and paste the token.
4. Run **Actions › Build Android app › Run workflow**. Free builds can wait in a queue first. When it finishes, the run's summary has a **Download Chore Board APK** link.

Open that link on each Android phone, download the APK and install it (allow "Install unknown apps" when asked). Run the workflow again whenever the app changes; installing the new APK keeps the phone's settings.

To build from a computer instead: `npx eas-cli@latest login`, `npx eas-cli@latest init`, then `npm run build:android`.

### 5. On each phone

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
- **Alert job (`server/`, run by `.github/workflows/alerts.yml`):** checks once per run for chores that have come due in the last 45 minutes in each household's time zone, and pushes to that person's registered browsers, each alert once. It reuses `src/lib/schedule.ts`. Test it with `npm --prefix server test`.
