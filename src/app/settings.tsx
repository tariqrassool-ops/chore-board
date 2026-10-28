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
        {Platform.OS === 'android' ? (
          <Body muted>
            If the alarm only shows as a small notification, open alert settings and turn on "Full screen notifications" (sometimes called
            "Full-screen intent") for Chore Board. Also turn off battery optimisation for the app so alarms aren't delayed.
          </Body>
        ) : (
          <Body muted>
            On iPhone the alarm appears on the lock screen and over other apps with a sound. If you use a Focus mode, allow Chore Board under
            Settings › Focus so time-sensitive alerts get through. The ring switch must be on to hear it.
          </Body>
        )}
        <Button kind="ghost" label="Open alert settings" onPress={() => openNotificationSettings()} />
      </Card>

      <Card>
        <H2>Add someone's phone</H2>
        <Body muted>Install Chore Board on their phone, choose "Join one", and enter this code:</Body>
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
