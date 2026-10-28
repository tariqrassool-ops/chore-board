# Chore Board

A shared daily chore board for the household. Chores are shared out fairly by effort points, and each person's phone rings when one of their chores is due, even if the phone is locked or another app is open.

- **Android:** a full-screen alarm with sound that keeps ringing until it's marked done, snoozed or dismissed, like the Clock app.
- **iPhone:** a time-sensitive alert with sound on the lock screen and over other apps. Apple only allows full-screen alarms for its own Clock app (or apps using AlarmKit, which can come later).

## How chores are shared

Every chore has effort points from 1 (quick, like feeding the cat) to 5 (huge, like a deep clean). For the next two weeks, each chore goes to whoever has the fewest points for their share, counting what they finished in the last four weeks. People can be on a full share, a half share (a child, say) or away. Nobody gets the same chore twice in a row if someone else can take it. Anyone can hand a chore to someone else from the board, and "Re-deal all open chores" starts the next two weeks fresh.

The logic is in [`src/lib/schedule.ts`](src/lib/schedule.ts) with tests in `schedule.test.ts`.

## One-time setup

### 1. Connect Firebase (the shared board)

1. Go to <https://console.firebase.google.com>, choose **Create a project**, and give it any name. Google Analytics isn't needed.
2. In the project, open **Build › Firestore Database**, choose **Create database**, pick a location near you, and start in **production mode**.
3. Open the **Rules** tab, replace the contents with [`firestore.rules`](firestore.rules) from this repo, and choose **Publish**.
4. Open **Project settings** (the gear), scroll to **Your apps**, and add a **Web app** (the `</>` button). Copy the values from the config it shows.
5. Copy `.env.example` to `.env` and paste each value in. These values identify the project and are safe to keep in the app.

### 2. Build the app

Builds run on Expo's servers, so no Xcode or Android Studio is needed. You need a free account at <https://expo.dev>.

```bash
npm install
npx eas-cli@latest login
npx eas-cli@latest init          # links the project to your Expo account
npx eas-cli@latest env:create --name EXPO_PUBLIC_FIREBASE_API_KEY --value <value> --environment preview
# …repeat for each value in .env, or create them in the Expo dashboard under Environment variables
npm run build:android            # gives a download link for an .apk
npm run build:ios                # needs an Apple Developer account ($99/year)
```

**Android:** open the build link on each Android phone, download the APK and install it (allow "Install unknown apps" when asked).

**iPhone:** Apple requires a developer account to install apps outside the App Store. With one, `npm run build:ios` registers each iPhone (`npx eas-cli@latest device:create`) for internal distribution. Alternatively, upload a production build to TestFlight and invite the household by email.

### 3. On each phone

1. Open Chore Board. The first person chooses **Start a new household**. Everyone else chooses **Join one** and enters the code from **Alarms & sharing** on the first phone.
2. Pick who you are. The phone only rings for that person's chores.
3. In **Alarms & sharing**, tap **Allow alarms**, then **Ring a test alarm in 10 seconds** and lock the phone to check it.

Android phone settings worth checking:
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

Each phone schedules its own alarms locally for the next 7 days and refreshes them whenever the board changes or the app is opened, so alarms ring even with no internet. Open the app at least once a week to keep them topped up.
