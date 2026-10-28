import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { DAY_NAMES, WEEK_ORDER } from '../lib/format';
import { useHousehold } from '../lib/HouseholdContext';
import { dateKey } from '../lib/schedule';
import { randomId, saveChores } from '../lib/store';
import { CATEGORY_LABELS, type Category, type Chore, type Frequency } from '../lib/types';
import { Body, Button, Card, Field, Label, Pill, Row, Screen } from '../ui/components';
import { useTheme } from '../ui/theme';

const EFFORT = ['quick', 'small', 'medium', 'big', 'huge'];

export default function ChoreEditor() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { household, householdId } = useHousehold();
  const t = useTheme();
  const existing = household?.chores.find((c) => c.id === id);

  const [name, setName] = useState(existing?.name ?? '');
  const [cat, setCat] = useState<Category>(existing?.cat ?? 'cleaning');
  const [points, setPoints] = useState(existing?.points ?? 2);
  const [time, setTime] = useState(existing?.time ?? '18:00');
  const [repeat, setRepeat] = useState<Frequency['type']>(existing?.freq.type ?? 'weekly');
  const [days, setDays] = useState<number[]>(existing?.freq.type === 'weekly' ? existing.freq.days : [6]);
  const [every, setEvery] = useState(String(existing?.freq.type === 'every' ? existing.freq.n : 3));
  const [who, setWho] = useState<string[]>(existing?.who ?? []);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  if (!household || !householdId) return null;

  const save = async () => {
    const m = /^(\d{1,2})[:.](\d{2})$/.exec(time.trim());
    if (!name.trim()) return setErr('Give the chore a name.');
    if (!m || +m[1] > 23 || +m[2] > 59) return setErr('Enter the time as hours and minutes, like 18:00.');
    if (repeat === 'weekly' && !days.length) return setErr('Pick at least one day.');
    const freq: Frequency =
      repeat === 'daily' ? { type: 'daily' } : repeat === 'weekly' ? { type: 'weekly', days } : { type: 'every', n: Math.max(2, Math.min(60, parseInt(every, 10) || 2)) };
    const chore: Chore = {
      id: existing?.id ?? randomId(8),
      name: name.trim(),
      cat,
      points,
      time: `${m[1].padStart(2, '0')}:${m[2]}`,
      freq,
      who,
      start: existing?.start ?? dateKey(new Date()),
    };
    const chores = existing ? household.chores.map((c) => (c.id === chore.id ? chore : c)) : [...household.chores, chore];
    // An edited chore's open dates are re-dealt; the board tops up new ones automatically.
    await saveChores(householdId, chores, existing ? [chore.id] : []);
    router.back();
  };

  const remove = async () => {
    if (!existing) return;
    if (!confirmDelete) return setConfirmDelete(true);
    await saveChores(householdId, household.chores.filter((c) => c.id !== existing.id), [existing.id]);
    router.back();
  };

  const toggle = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  return (
    <Screen>
      <Card>
        <Field label="Chore" value={name} onChangeText={setName} placeholder="e.g. Feed the dog (evening)" maxLength={60} />
        <Label>Type</Label>
        <Row wrap>
          {(Object.keys(CATEGORY_LABELS) as Category[]).map((k) => (
            <Pill key={k} label={CATEGORY_LABELS[k]} selected={cat === k} onPress={() => setCat(k)} />
          ))}
        </Row>
        <Label>Effort</Label>
        <Row wrap>
          {[1, 2, 3, 4, 5].map((n) => (
            <Pill key={n} label={`${n} · ${EFFORT[n - 1]}`} selected={points === n} onPress={() => setPoints(n)} />
          ))}
        </Row>
      </Card>

      <Card>
        <Field label="Time (24-hour)" value={time} onChangeText={setTime} keyboardType="numbers-and-punctuation" placeholder="18:00" maxLength={5} />
        <Body muted>The phone of whoever's turn it is rings at this time.</Body>
        <Label>Repeats</Label>
        <Row wrap>
          <Pill label="Every day" selected={repeat === 'daily'} onPress={() => setRepeat('daily')} />
          <Pill label="On certain days" selected={repeat === 'weekly'} onPress={() => setRepeat('weekly')} />
          <Pill label="Every few days" selected={repeat === 'every'} onPress={() => setRepeat('every')} />
        </Row>
        {repeat === 'weekly' && (
          <Row wrap>
            {WEEK_ORDER.map((d) => (
              <Pill key={d} label={DAY_NAMES[d]} selected={days.includes(d)} onPress={() => setDays(toggle(days, d))} />
            ))}
          </Row>
        )}
        {repeat === 'every' && <Field label="Every how many days" value={every} onChangeText={setEvery} keyboardType="number-pad" maxLength={2} />}
      </Card>

      <Card>
        <Label>Who can do it</Label>
        <Row wrap>
          {household.members.map((m) => (
            <Pill key={m.id} label={m.name} color={m.color} selected={who.includes(m.id)} onPress={() => setWho(toggle(who, m.id))} />
          ))}
        </Row>
        <Body muted>{who.length ? 'Only the people picked take turns.' : 'Nobody picked, so everyone takes turns.'}</Body>
      </Card>

      {err && <Body style={{ color: t.warn }}>{err}</Body>}
      <Button kind="primary" big label={existing ? 'Save chore' : 'Add chore'} onPress={save} />
      {existing && <Button kind="danger" label={confirmDelete ? 'Tap again to delete' : 'Delete chore'} onPress={remove} />}
    </Screen>
  );
}
