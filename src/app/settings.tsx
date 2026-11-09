import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Platform, Share, Text } from 'react-native';
import {
  checkAlarmPermissions,
  openExactAlarmSettings,
  openNotificationSettings,
  requestAlarmPermissions,
  testAlarm,
  type AlarmPermissions,
} from '../lib/alarms';
import { useHousehold } from '../lib/HouseholdContext';
import { Body, Button, Card, H2, Label, Pill, Row, Screen } from '../ui/components';
import { useTheme } from '../ui/theme';

export default function Settings() {
  const { household, householdId, memberId, setIdentity, alarmCount, resyncAlarms } = useHousehold();
  const t = useTheme();
  const [perms, setPerms] = useState<AlarmPermissions | null>(null);
  const [note, setNote] = useState<string | null>(null);

  const refresh = useCallback(() => {
    checkAlarmPermissions().then(setPerms).catch(() => setPerms(null));
  }, []);
  useFocusEffect(refresh);

  if (!household || !householdId) return null;
  const me = household.members.find((m) => m.id === memberId);

  const allow = async () => {
    setPerms(await requestAlarmPermissions());
    await resyncAlarms();
  };

  return (
    <Screen>
      {Platform.OS === 'web' ? <WebAlerts perms={perms} me={me?.name} count={alarmCount} onAllow={allow} /> : (
      <Card>
        <H2>Alarms on this phone</H2>
        <Body>
          This phone rings for <Text style={{ fontWeight: '800' }}>{me?.name ?? 'nobody'}</Text>.{' '}
          {alarmCount ? `${alarmCount} alarms are set for the next 7 days.` : 'No alarms are set yet.'}
        </Body>
        <Row>
          <Status ok={perms?.notifications} label="Alerts allowed" />
        </Row>
        {Platform.OS === 'android' && (
          <Row>
            <Status ok={perms?.exactAlarms} label="Alarms ring on time" />
          </Row>
        )}
        {!perms?.notifications && <Button kind="primary" label="Allow alarms" onPress={allow} />}
        {Platform.OS === 'android' && perms && !perms.exactAlarms && (
          <Button label="Let alarms ring on time" onPress={() => openExactAlarmSettings().then(refresh)} />
        )}
        <Button
          label="Ring a test alarm in 10 seconds"
          onPress={async () => {
            await testAlarm();
            setNote('Lock your phone or switch apps now. The test alarm rings in 10 seconds.');
          }}
        />
        {note && <Body muted>{note}</Body>}
        <Body muted>
          If the alarm only shows as a small notification, open alert settings and turn on "Full screen notifications" (sometimes called
          "Full-screen intent") for Chore Board. Also turn off battery optimisation for the app so alarms aren't delayed.
        </Body>
        <Button kind="ghost" label="Open alert settings" onPress={() => openNotificationSettings()} />
      </Card>
      )}

      <Card>
        <H2>Add someone's phone</H2>
        <Body muted>
          Android: install the Chore Board app. iPhone: open the board's web address in Safari. Then choose "Join one" and enter this code:
        </Body>
        <Text selectable style={{ color: t.fg, fontSize: 26, fontWeight: '800', letterSpacing: 2, fontVariant: ['tabular-nums'] }}>{householdId}</Text>
        <Button label="Share code" onPress={() => Share.share({ message: `Join our Chore Board. Household code: ${householdId}` })} />
      </Card>

      <Card>
        <Label>This phone belongs to</Label>
        <Row wrap>
          {household.members.map((m) => (
            <Pill key={m.id} label={m.name} color={m.color} selected={m.id === memberId} onPress={() => setIdentity({ householdId, memberId: m.id })} />
          ))}
        </Row>
        <Button kind="danger" label="Leave this household on this phone" onPress={() => setIdentity({ householdId: null, memberId: null })} />
      </Card>
    </Screen>
  );
}

function Status({ ok, label }: { ok: boolean | undefined; label: string }) {
  const t = useTheme();
  return (
    <Text style={{ color: ok ? t.accent : t.warn, fontWeight: '700' }}>
      {ok ? '✓' : '✕'} {label}
    </Text>
  );
}

const isAndroid = typeof navigator !== 'undefined' && /Android/i.test(navigator.userAgent);

/** iPhones (and any browser) get alerts as web pushes sent by the server. */
function WebAlerts({ perms, me, count, onAllow }: { perms: AlarmPermissions | null; me?: string; count: number; onAllow: () => void }) {
  const [note, setNote] = useState<string | null>(null);
  return (
    <Card>
      <H2>Alerts on this phone</H2>
      {perms?.needsHomeScreen ? (
        <>
          <Body>To get alerts on an iPhone, add the board to your home screen first:</Body>
          <Body muted>1. Tap the Share button at the bottom of Safari.</Body>
          <Body muted>2. Choose "Add to Home Screen", then Add.</Body>
          <Body muted>3. Open Chore Board from the home screen and come back here.</Body>
        </>
      ) : (
        <>
          <Body>
            This phone gets alerts for <Text style={{ fontWeight: '800' }}>{me ?? 'nobody'}</Text>.{' '}
            {perms?.notifications ? `${count} alerts are coming in the next 7 days.` : 'Alerts are off.'}
          </Body>
          <Row>
            <Status ok={perms?.notifications} label="Alerts allowed" />
          </Row>
          {!perms?.notifications && <Button kind="primary" label="Turn on alerts" onPress={onAllow} />}
          {perms?.notifications && (
            <Button
              label="Show a test alert"
              onPress={async () => {
                try {
                  await testAlarm();
                  setNote(
                    isAndroid
                      ? 'A test alert should appear now. If it doesn\'t, see the Android steps below.'
                      : 'A test alert should appear now.',
                  );
                } catch (e) {
                  setNote(`The test alert couldn't be shown: ${e instanceof Error ? e.message : String(e)}`);
                }
              }}
            />
          )}
          {note && <Body muted>{note}</Body>}
          {isAndroid ? (
            <>
              <Body muted>
                Alerts arrive as notifications with a sound, usually within 5 to 15 minutes of the chore's time. If the test alert doesn't
                appear on Android:
              </Body>
              <Body muted>1. Open Settings › Apps › Chrome › Notifications and make sure notifications are on.</Body>
              <Body muted>
                2. In the same list, find the {location.host} site (under Sites) and set it to Alerting, with "Pop on screen" on.
              </Body>
              <Body muted>3. Turn off Do Not Disturb, or allow Chrome in it.</Body>
              <Body muted>For a full-screen alarm that rings until it's dismissed, use the Chore Board Android app instead.</Body>
            </>
          ) : (
            <Body muted>
              Alerts arrive on the lock screen and over other apps with a sound, usually within 5 to 15 minutes of the chore's time. The
              ring switch must be on to hear them, and a Focus mode can hide them unless Chore Board is allowed.
            </Body>
          )}
        </>
      )}
    </Card>
  );
}
