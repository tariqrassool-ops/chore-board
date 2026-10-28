import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View, type TextInputProps, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { memberColor, useTheme } from './theme';

export function Screen({ children, scroll = true }: { children: ReactNode; scroll?: boolean }) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const pad = { padding: 16, paddingBottom: 16 + insets.bottom, gap: 14 };
  return scroll ? (
    <ScrollView style={{ flex: 1, backgroundColor: t.bg }} contentContainerStyle={pad} keyboardShouldPersistTaps="handled">
      {children}
    </ScrollView>
  ) : (
    <View style={[{ flex: 1, backgroundColor: t.bg }, pad]}>{children}</View>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  const t = useTheme();
  return (
    <View style={[{ backgroundColor: t.surface, borderColor: t.line, borderWidth: StyleSheet.hairlineWidth, borderRadius: 12, padding: 14, gap: 10 }, style]}>
      {children}
    </View>
  );
}

export function H1({ children }: { children: ReactNode }) {
  const t = useTheme();
  return <Text style={{ color: t.fg, fontSize: 26, fontWeight: '800' }}>{children}</Text>;
}

export function H2({ children }: { children: ReactNode }) {
  const t = useTheme();
  return <Text style={{ color: t.fg, fontSize: 18, fontWeight: '700' }}>{children}</Text>;
}

export function Body({ children, muted, style }: { children: ReactNode; muted?: boolean; style?: object }) {
  const t = useTheme();
  return <Text style={[{ color: muted ? t.muted : t.fg, fontSize: 15, lineHeight: 21 }, style]}>{children}</Text>;
}

export function Button({
  label,
  onPress,
  kind = 'secondary',
  disabled,
  big,
}: {
  label: string;
  onPress: () => void;
  kind?: 'primary' | 'secondary' | 'ghost' | 'danger';
  disabled?: boolean;
  big?: boolean;
}) {
  const t = useTheme();
  const bg = kind === 'primary' ? t.accent : kind === 'secondary' ? t.surface : 'transparent';
  const fg = kind === 'primary' ? t.accentInk : kind === 'danger' ? t.warn : kind === 'ghost' ? t.muted : t.fg;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => ({
        backgroundColor: bg,
        borderColor: kind === 'secondary' ? t.line : bg,
        borderWidth: kind === 'secondary' ? 1 : 0,
        borderRadius: 10,
        paddingVertical: big ? 16 : 10,
        paddingHorizontal: 14,
        alignItems: 'center',
        opacity: disabled ? 0.4 : pressed ? 0.75 : 1,
      })}
    >
      <Text style={{ color: fg, fontWeight: '700', fontSize: big ? 18 : 15 }}>{label}</Text>
    </Pressable>
  );
}

export function Field({ label, ...props }: TextInputProps & { label: string }) {
  const t = useTheme();
  return (
    <View style={{ gap: 4 }}>
      <Text style={{ color: t.muted, fontSize: 12, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase' }}>{label}</Text>
      <TextInput
        placeholderTextColor={t.muted}
        {...props}
        style={{ color: t.fg, backgroundColor: t.surface, borderColor: t.line, borderWidth: 1, borderRadius: 10, padding: 11, fontSize: 16 }}
      />
    </View>
  );
}

export function Label({ children }: { children: ReactNode }) {
  const t = useTheme();
  return <Text style={{ color: t.muted, fontSize: 12, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase' }}>{children}</Text>;
}

/** A tappable pill; used for picking people, days and options. */
export function Pill({ label, selected, onPress, color }: { label: string; selected?: boolean; onPress?: () => void; color?: number }) {
  const t = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        borderRadius: 999,
        borderWidth: selected ? 2 : 1,
        borderColor: selected ? t.fg : t.line,
        backgroundColor: t.surface,
        paddingVertical: selected ? 5 : 6,
        paddingHorizontal: selected ? 11 : 12,
      }}
    >
      {color != null && <Dot color={color} />}
      <Text style={{ color: t.fg, fontWeight: '600', fontSize: 14 }}>{label}</Text>
    </Pressable>
  );
}

export function Dot({ color, size = 12 }: { color?: number; size?: number }) {
  const t = useTheme();
  return <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: memberColor(t, color) }} />;
}

export function Row({ children, wrap, style }: { children: ReactNode; wrap?: boolean; style?: ViewStyle }) {
  return <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: wrap ? 'wrap' : 'nowrap' }, style]}>{children}</View>;
}

export function Effort({ points }: { points: number }) {
  const t = useTheme();
  return <Text style={{ color: t.accent, letterSpacing: 1 }}>{'●'.repeat(Math.max(1, Math.min(5, points)))}</Text>;
}
