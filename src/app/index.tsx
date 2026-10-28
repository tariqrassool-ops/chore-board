import { router, Stack, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { useHousehold } from '../lib/HouseholdContext';
import { addDays, dateKey, dueAt, eligible, occurrences, ownerOf, startOfDay, weekTotals } from '../lib/schedule';
import { markDone, reassign } from '../lib/store';
import { CATEGORY_LABELS, type Household, type Occurrence } from '../lib/types';
import { Body, Card, Dot, Effort, H2, Label, Pill, Row, Screen } from '../ui/components';
import { memberColor, useTheme } from '../ui/theme';

export default function Today() {
  const { status, household, householdId, memberId, error } = useHousehold();

  useEffect(() => {
    if (status === 'needs-setup' || status === 'missing') router.replace('/setup');
  }, [status]);

  if (status === 'not-configured')
    return (
      <Screen>
        <Card>
          <H2>Almost there</H2>
          <Body muted>This copy of the app has no database connected. Follow "Connect Firebase" in the README, then rebuild the app.</Body>
        </Card>
      </Screen>
    );
  if (status === 'error')
    return (
      <Screen>
        <Card>
          <H2>Can't reach the board</H2>
          <Body muted>Check your internet connection, then reopen the app. ({error})</Body>
        </Card>
      </Screen>
    );
  if (status !== 'ready' || !household || !householdId) return <ActivityIndicator style={{ marginTop: 48 }} />;
  return <Board h={household} householdId={householdId} me={memberId!} />;
}

function Board({ h, householdId, me }: { h: Household; householdId: string; me: string }) {
  const t = useTheme();
  const [mine, setMine] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const [now, setNow] = useState(new Date());

  // Re-render each minute so "due now" and "missed" stay accurate.
  useFocusEffect(
    useCallback(() => {
      setNow(new Date());
      const timer = setInterval(() => setNow(new Date()), 60_000);
      return () => clearInterval(timer);
    }, []),
  );

  const today = startOfDay(now);
  const todayKey = dateKey(today);
  const filter = (o: Occurrence) => !mine || ownerOf(h, o.key) === me;
  const missed = occurrences(h, addDays(today, -2), 2).filter((o) => !h.done[o.key] && h.assign[o.key] && filter(o));
  const list = occurrences(h, today, 1).filter(filter);
  const tomorrow = occurrences(h, addDays(today, 1), 1).filter(filter);
  const next = occurrences(h, today, 2).find((o) => h.assign[o.key] === me && !h.done[o.key] && dueAt(o.date, o.time) > now);
  const meName = h.members.find((m) => m.id === me)?.name ?? '';
  const left = list.filter((o) => !h.done[o.key]).length;

  const toggle = (o: Occurrence) => {
    if (h.done[o.key]) return markDone(householdId, o.key, null);
    const by = h.assign[o.key] ?? me;
    return markDone(householdId, o.key, { by, at: Date.now(), pts: o.chore.points, name: o.chore.name });
  };

  const totals = useMemo(() => weekTotals(h, now), [h, now]);

  return (
    <Screen>
      <Stack.Screen
        options={{
          title: h.name,
          headerRight: () => (
            <Row>
              <HeaderLink label="Alarms" onPress={() => router.push('/settings')} />
              <HeaderLink label="Edit" onPress={() => router.push('/manage')} />
            </Row>
          ),
        }}
      />
      <View style={{ gap: 2 }}>
        <Text style={{ color: t.fg, fontSize: 28, fontWeight: '800' }}>
          {today.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}
        </Text>
        <Body muted>{left === 0 ? 'Everything is done for today.' : `${left} ${left === 1 ? 'chore' : 'chores'} left today.`}</Body>
      </View>

      {next && (
        <Card style={{ backgroundColor: t.fg, borderColor: t.fg }}>
          <Text style={{ color: t.bg, opacity: 0.8, fontSize: 12, fontWeight: '700', letterSpacing: 0.5 }}>YOUR NEXT CHORE, {meName.toUpperCase()}</Text>
          <Text style={{ color: t.bg, fontSize: 20, fontWeight: '800' }}>{next.chore.name}</Text>
          <Text style={{ color: t.bg, opacity: 0.85 }}>
            {next.date === todayKey ? 'Today' : 'Tomorrow'} at {next.time}. Your phone will ring then.
          </Text>
        </Card>
      )}

      <Row wrap>
        <Pill label="Everyone" selected={!mine} onPress={() => setMine(false)} />
        <Pill label="Just me" selected={mine} onPress={() => setMine(true)} />
      </Row>

      {missed.length > 0 && (
        <Section title="Missed" tone="warn">
          {missed.map((o) => (
            <ChoreRow key={o.key} o={o} h={h} now={now} label={new Date(dueAt(o.date, o.time)).toLocaleDateString(undefined, { weekday: 'short' })}
              open={open === o.key} onOpen={() => setOpen(open === o.key ? null : o.key)} onToggle={() => toggle(o)}
              onGive={(id) => reassign(householdId, o.key, id).then(() => setOpen(null))} />
          ))}
        </Section>
      )}

      <Section title="Today">
        {list.length === 0 ? <Body muted>Nothing on today.</Body> : list.map((o) => (
          <ChoreRow key={o.key} o={o} h={h} now={now} open={open === o.key} onOpen={() => setOpen(open === o.key ? null : o.key)}
            onToggle={() => toggle(o)} onGive={(id) => reassign(householdId, o.key, id).then(() => setOpen(null))} />
        ))}
      </Section>

      <Section title="Tomorrow">
        {tomorrow.length === 0 ? <Body muted>Nothing on tomorrow.</Body> : tomorrow.map((o) => (
          <ChoreRow key={o.key} o={o} h={h} now={now} open={open === o.key} onOpen={() => setOpen(open === o.key ? null : o.key)}
            onToggle={() => toggle(o)} onGive={(id) => reassign(householdId, o.key, id).then(() => setOpen(null))} />
        ))}
      </Section>

      <Card>
        <Label>This week's effort points</Label>
        {h.members.map((m) => {
          const tt = totals[m.id] ?? { done: 0, planned: 0 };
          const max = Math.max(1, ...Object.values(totals).map((x) => x.done + x.planned));
          return (
            <View key={m.id} style={{ gap: 4 }}>
              <Row style={{ justifyContent: 'space-between' }}>
                <Row><Dot color={m.color} /><Body>{m.name}{m.paused ? ' (away)' : ''}</Body></Row>
                <Body muted>{tt.done} done · {tt.planned} to do</Body>
              </Row>
              <View style={{ height: 8, borderRadius: 4, backgroundColor: t.sunk, overflow: 'hidden', flexDirection: 'row' }}>
                <View style={{ width: `${(tt.done / max) * 100}%`, backgroundColor: memberColor(t, m.color) }} />
                <View style={{ width: `${(tt.planned / max) * 100}%`, backgroundColor: memberColor(t, m.color), opacity: 0.3 }} />
              </View>
            </View>
          );
        })}
      </Card>
    </Screen>
  );
}

function HeaderLink({ label, onPress }: { label: string; onPress: () => void }) {
  const t = useTheme();
  return (
    <Pressable onPress={onPress} hitSlop={8} accessibilityRole="button">
      <Text style={{ color: t.accent, fontWeight: '700', fontSize: 16 }}>{label}</Text>
    </Pressable>
  );
}

function Section({ title, tone, children }: { title: string; tone?: 'warn'; children: React.ReactNode }) {
  const t = useTheme();
  return (
    <View style={{ gap: 8 }}>
      <Text style={{ color: tone === 'warn' ? t.warn : t.muted, fontSize: 13, fontWeight: '800', letterSpacing: 0.6 }}>{title.toUpperCase()}</Text>
      <View style={{ backgroundColor: t.surface, borderRadius: 12, borderWidth: 1, borderColor: t.line, overflow: 'hidden' }}>{children}</View>
    </View>
  );
}

function ChoreRow({ o, h, now, label, open, onOpen, onToggle, onGive }: {
  o: Occurrence; h: Household; now: Date; label?: string; open: boolean;
  onOpen: () => void; onToggle: () => void; onGive: (memberId: string) => void;
}) {
  const t = useTheme();
  const done = !!h.done[o.key];
  const owner = h.members.find((m) => m.id === ownerOf(h, o.key));
  const due = dueAt(o.date, o.time);
  const dueNow = !done && due <= now && now.getTime() - due.getTime() < 2 * 3600_000;
  return (
    <View style={{ borderTopWidth: 1, borderTopColor: t.sunk, backgroundColor: dueNow ? t.warnBg : undefined }}>
      <Row style={{ paddingVertical: 12, paddingHorizontal: 12, gap: 12 }}>
        <Pressable
          onPress={onToggle}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: done }}
          accessibilityLabel={`Mark ${o.chore.name} done`}
          hitSlop={10}
          style={{ width: 28, height: 28, borderRadius: 14, borderWidth: 2, borderColor: done ? t.accent : t.line, backgroundColor: done ? t.accent : 'transparent', alignItems: 'center', justifyContent: 'center' }}
        >
          {done && <Text style={{ color: t.accentInk, fontWeight: '900' }}>✓</Text>}
        </Pressable>
        <Pressable onPress={onOpen} style={{ flex: 1, gap: 2 }} accessibilityHint="Shows who else can do it">
          <Text style={{ color: done ? t.muted : t.fg, fontWeight: '700', fontSize: 16, textDecorationLine: done ? 'line-through' : 'none' }}>{o.chore.name}</Text>
          <Row>
            <Text style={{ color: t.muted, fontVariant: ['tabular-nums'] }}>{label ? `${label} ` : ''}{o.time}</Text>
            <Text style={{ color: t.muted }}>· {CATEGORY_LABELS[o.chore.cat]} ·</Text>
            <Effort points={o.chore.points} />
          </Row>
        </Pressable>
        <Pressable onPress={onOpen} accessibilityRole="button" accessibilityLabel={`Assigned to ${owner?.name ?? 'nobody'}. Change`}>
          <Row style={{ gap: 6 }}>
            <Dot color={owner?.color} size={14} />
            <Text style={{ color: t.fg, fontWeight: '600', maxWidth: 90 }} numberOfLines={1}>{owner?.name ?? 'Nobody'}</Text>
          </Row>
        </Pressable>
      </Row>
      {open && !done && (
        <View style={{ paddingHorizontal: 12, paddingBottom: 12, gap: 8 }}>
          <Label>Give this chore to</Label>
          <Row wrap>
            {eligible(h, o.chore).map((m) => (
              <Pill key={m.id} label={m.name} color={m.color} selected={m.id === owner?.id} onPress={() => onGive(m.id)} />
            ))}
          </Row>
        </View>
      )}
    </View>
  );
}

