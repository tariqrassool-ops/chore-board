import { router } from 'expo-router';
import { useState } from 'react';
import { useHousehold } from '../lib/HouseholdContext';
import { starterChores } from '../lib/starter';
import { createHousehold, householdExists, randomId, rebalance, saveMembers } from '../lib/store';
import type { Member } from '../lib/types';
import { Body, Button, Card, Field, H1, H2, Pill, Row, Screen } from '../ui/components';
import { useTheme } from '../ui/theme';

export default function Setup() {
  const { household, householdId, setIdentity, status } = useHousehold();
  // Joined a household but haven't said who you are yet.
  if (household && householdId && status !== 'missing') return <PickYourself />;
  return <CreateOrJoin missing={status === 'missing'} onDone={() => router.replace('/')} setIdentity={setIdentity} />;
}

function CreateOrJoin({ missing, onDone, setIdentity }: {
  missing: boolean; onDone: () => void; setIdentity: ReturnType<typeof useHousehold>['setIdentity'];
}) {
  const [mode, setMode] = useState<'create' | 'join'>('create');
  const [home, setHome] = useState('Our home');
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const t = useTheme();

  const create = async () => {
    if (!name.trim()) return setErr('Enter your name.');
    setBusy(true);
    setErr(null);
    try {
      const me: Member = { id: randomId(8), name: name.trim(), color: 0, share: 1 };
      const id = await createHousehold(home.trim() || 'Our home', me, starterChores(() => randomId(8)));
      await setIdentity({ householdId: id, memberId: me.id });
      onDone();
    } catch (e) {
      setErr(`Couldn't create the board. Check your connection and try again. (${(e as Error).message})`);
    } finally {
      setBusy(false);
    }
  };

  const join = async () => {
    const id = code.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
    if (id.length < 10) return setErr('That code looks too short. Copy it from Alarms & sharing on the other phone.');
    setBusy(true);
    setErr(null);
    try {
      if (!(await householdExists(id))) return setErr('No household has that code. Check it and try again.');
      await setIdentity({ householdId: id, memberId: null });
    } catch (e) {
      setErr(`Couldn't reach the board. (${(e as Error).message})`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <H1>Chore Board</H1>
      <Body muted>One shared board for the whole household. Chores are shared out fairly, and each phone rings when its person's chore is due.</Body>
      {missing && <Body muted>The household this phone was linked to no longer exists. Create a new one or join another.</Body>}
      <Row>
        <Pill label="Start a new household" selected={mode === 'create'} onPress={() => setMode('create')} />
        <Pill label="Join one" selected={mode === 'join'} onPress={() => setMode('join')} />
      </Row>
      {mode === 'create' ? (
        <Card>
          <Field label="Household name" value={home} onChangeText={setHome} maxLength={40} />
          <Field label="Your name" value={name} onChangeText={setName} placeholder="e.g. Tariq" maxLength={30} autoFocus />
          <Body muted>You'll start with common chores like feeding the pets and the weekly shop. You can change them all.</Body>
          <Button kind="primary" big label={busy ? 'Creating…' : 'Create household'} onPress={create} disabled={busy} />
        </Card>
      ) : (
        <Card>
          <Field label="Household code" value={code} onChangeText={setCode} placeholder="From the other phone" autoCapitalize="none" autoCorrect={false} />
          <Button kind="primary" big label={busy ? 'Checking…' : 'Join'} onPress={join} disabled={busy} />
        </Card>
      )}
      {err && <Body style={{ color: t.warn }}>{err}</Body>}
    </Screen>
  );
}

function PickYourself() {
  const { household, householdId, setIdentity } = useHousehold();
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  if (!household || !householdId) return null;

  const choose = async (memberId: string) => {
    await setIdentity({ householdId, memberId });
    router.replace('/');
  };
  const addMe = async () => {
    if (!name.trim()) return;
    setBusy(true);
    const used = new Set(household.members.map((m) => m.color));
    let color = 0;
    while (used.has(color) && color < 6) color++;
    const me: Member = { id: randomId(8), name: name.trim(), color: color % 6, share: 1 };
    const members = [...household.members, me];
    await saveMembers(householdId, members);
    // Re-deal open chores so the newcomer gets their fair share straight away.
    await rebalance(householdId, { ...household, members });
    setBusy(false);
    await choose(me.id);
  };

  return (
    <Screen>
      <H1>Who are you?</H1>
      <Body muted>This phone will ring for your chores only. You can change this later.</Body>
      {household.members.length > 0 && (
        <Card>
          <H2>I'm already on the board</H2>
          <Row wrap>
            {household.members.map((m) => (
              <Pill key={m.id} label={m.name} color={m.color} onPress={() => choose(m.id)} />
            ))}
          </Row>
        </Card>
      )}
      <Card>
        <H2>Add me</H2>
        <Field label="Your name" value={name} onChangeText={setName} maxLength={30} />
        <Button kind="primary" label={busy ? 'Adding…' : 'Add me to the household'} onPress={addMe} disabled={busy || !name.trim()} />
      </Card>
      <Button kind="ghost" label="Use a different household" onPress={() => setIdentity({ householdId: null, memberId: null })} />
    </Screen>
  );
}
