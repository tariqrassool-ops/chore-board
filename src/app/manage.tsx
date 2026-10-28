import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useHousehold } from '../lib/HouseholdContext';
import { rebalance, randomId, renameHousehold, saveMembers } from '../lib/store';
import { CATEGORY_LABELS, type Household, type Member } from '../lib/types';
import { Body, Button, Card, Dot, Effort, Field, H2, Label, Pill, Row, Screen } from '../ui/components';
import { useTheme } from '../ui/theme';
import { repeatText } from '../lib/format';

export default function Manage() {
  const { household, householdId } = useHousehold();
  if (!household || !householdId) return null;
  return <ManageInner h={household} id={householdId} />;
}

function ManageInner({ h, id }: { h: Household; id: string }) {
  const t = useTheme();
  const [newName, setNewName] = useState('');
  const [home, setHome] = useState(h.name);
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  const saveAndRebalance = async (members: Member[], message: string) => {
    await saveMembers(id, members);
    await rebalance(id, { ...h, members });
    setNote(message);
  };

  const addPerson = async () => {
    const name = newName.trim();
    if (!name) return;
    const used = new Set(h.members.map((m) => m.color));
    let color = 0;
    while (used.has(color) && color < 6) color++;
    setNewName('');
    await saveAndRebalance([...h.members, { id: randomId(8), name, color: color % 6, share: 1 }], `${name} added. Open chores were re-dealt.`);
  };

  const setShare = (m: Member, choice: 'full' | 'half' | 'away') =>
    saveAndRebalance(
      h.members.map((x) => (x.id === m.id ? { ...x, share: choice === 'half' ? 0.5 : 1, paused: choice === 'away' } : x)),
      `Saved. Open chores were re-dealt.`,
    );

  const remove = async (m: Member) => {
    if (confirmRemove !== m.id) return setConfirmRemove(m.id);
    setConfirmRemove(null);
    await saveAndRebalance(h.members.filter((x) => x.id !== m.id), `${m.name} removed. Their open chores were re-dealt.`);
  };

  return (
    <Screen>
      {note && <Body muted>{note}</Body>}
      <Card>
        <H2>People</H2>
        {h.members.map((m) => {
          const share = m.paused ? 'away' : m.share < 1 ? 'half' : 'full';
          return (
            <View key={m.id} style={{ gap: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: t.sunk }}>
              <Row style={{ justifyContent: 'space-between' }}>
                <Row><Dot color={m.color} size={14} /><Text style={{ color: t.fg, fontWeight: '700', fontSize: 16 }}>{m.name}</Text></Row>
                <Button kind="danger" label={confirmRemove === m.id ? 'Tap again to remove' : 'Remove'} onPress={() => remove(m)} />
              </Row>
              <Row wrap>
                <Pill label="Full share" selected={share === 'full'} onPress={() => setShare(m, 'full')} />
                <Pill label="Half share" selected={share === 'half'} onPress={() => setShare(m, 'half')} />
                <Pill label="Away" selected={share === 'away'} onPress={() => setShare(m, 'away')} />
              </Row>
            </View>
          );
        })}
        <Field label="Add a person" value={newName} onChangeText={setNewName} placeholder="Name" maxLength={30} onSubmitEditing={addPerson} />
        <Button label="Add person" onPress={addPerson} disabled={!newName.trim()} />
        <Body muted>Half share suits a child or someone on long shifts: they get about half as many effort points. Away means no new chores until they're back.</Body>
      </Card>

      <Card>
        <Row style={{ justifyContent: 'space-between' }}>
          <H2>Chores</H2>
          <Button kind="primary" label="Add chore" onPress={() => router.push('/chore')} />
        </Row>
        {h.chores.length === 0 && <Body muted>No chores yet.</Body>}
        {h.chores.map((c) => (
          <Pressable key={c.id} onPress={() => router.push({ pathname: '/chore', params: { id: c.id } })} style={{ paddingTop: 8, borderTopWidth: 1, borderTopColor: t.sunk, gap: 2 }}>
            <Text style={{ color: t.fg, fontWeight: '700', fontSize: 16 }}>{c.name}</Text>
            <Row wrap>
              <Text style={{ color: t.muted }}>{CATEGORY_LABELS[c.cat]} · {repeatText(c)} at {c.time} ·</Text>
              <Effort points={c.points} />
            </Row>
          </Pressable>
        ))}
      </Card>

      <Card>
        <H2>Fair sharing</H2>
        <Body muted>Every chore for the next two weeks goes to whoever has the fewest effort points for their share, counting what they finished in the last four weeks. Nobody gets the same chore twice in a row if someone else can take it.</Body>
        <Button label="Re-deal all open chores now" onPress={async () => { await rebalance(id, h); setNote('Open chores were re-dealt.'); }} />
      </Card>

      <Card>
        <Label>Household name</Label>
        <Field label="Name" value={home} onChangeText={setHome} onEndEditing={() => home.trim() && renameHousehold(id, home.trim())} maxLength={40} />
      </Card>
    </Screen>
  );
}
