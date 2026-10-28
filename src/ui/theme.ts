import { useColorScheme } from 'react-native';

const light = {
  bg: '#eef2f1',
  surface: '#ffffff',
  sunk: '#e3e9e7',
  line: '#cdd6d3',
  fg: '#17221f',
  muted: '#5b6a66',
  accent: '#0f7a63',
  accentInk: '#ffffff',
  warn: '#b4540c',
  warnBg: '#fdf0e3',
  members: ['#2c6fd1', '#c2410c', '#7c3aed', '#0f8a5f', '#b8337a', '#8a6d00'],
};

const dark: typeof light = {
  bg: '#111816',
  surface: '#19221f',
  sunk: '#0c1210',
  line: '#2c3935',
  fg: '#e5ece9',
  muted: '#93a39e',
  accent: '#3fc29d',
  accentInk: '#06261d',
  warn: '#f0a35e',
  warnBg: '#2e2116',
  members: ['#79a7f0', '#f2905c', '#b195f7', '#5fd0a2', '#ec84b9', '#d8bc4a'],
};

export type Theme = typeof light;

export function useTheme(): Theme {
  return useColorScheme() === 'dark' ? dark : light;
}

export const memberColor = (t: Theme, color: number | undefined) =>
  color == null ? t.muted : t.members[color % t.members.length];
