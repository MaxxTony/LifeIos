/** Shared color utilities and theme helpers for all Android widgets. */

export const COLOR_MAP: Record<string, string> = {
  Royal: '#7C5CFF',
  Azure: '#5B8CFF',
  Neo: '#00D68F',
  Coral: '#FF4B4B',
  Sunset: '#FFB347',
  Candy: '#FF69B4',
  Cyber: '#00CED1',
  Emerald: '#10B981',
  Violet: '#8B5CF6',
  Crimson: '#DC2626',
  Amber: '#D97706',
  Rose: '#E11D48',
};

export function resolveAccent(raw: string | null | undefined): string {
  if (!raw) return '#7C5CFF';
  if (raw.startsWith('#')) return raw.length > 7 ? raw.slice(0, 7) : raw;
  return COLOR_MAP[raw] ?? '#7C5CFF';
}

export type ThemeMode = 'light' | 'dark';

export interface ThemeColors {
  bgGradient: { from: any; to: any; orientation: 'TOP_BOTTOM' | 'LEFT_RIGHT' };
  cardBg: any;
  cardBorder: any;
  textPrimary: any;
  textSecondary: any;
  textMuted: any;
  progressEmpty: any;
  shadowColor: any;
}

export function getThemeColors(theme: ThemeMode): ThemeColors {
  if (theme === 'light') {
    return {
      bgGradient: { from: '#FFFFFF', to: '#F8F9FA', orientation: 'TOP_BOTTOM' },
      cardBg: '#FFFFFF',
      cardBorder: '#E5E7EB',
      textPrimary: '#111827',
      textSecondary: '#4B5563',
      textMuted: '#9CA3AF',
      progressEmpty: '#E5E7EB',
      shadowColor: '#000000',
    };
  }
  return {
    bgGradient: { from: '#0D0D1A', to: '#141428', orientation: 'TOP_BOTTOM' },
    cardBg: '#1E1E38',
    cardBorder: '#2A2A42',
    textPrimary: '#FFFFFF',
    textSecondary: '#8888AA',
    textMuted: '#555570',
    progressEmpty: '#252540',
    shadowColor: '#000000',
  };
}

// Returns a valid `rgba(r, g, b, a)` string from a 6-digit hex color.
export function hexToRgba(
  hex: string,
  alpha: number
): `rgba(${number}, ${number}, ${number}, ${number})` {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})` as `rgba(${number}, ${number}, ${number}, ${number})`;
}

export function getToday(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function getDateOffset(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export const LEVEL_THRESHOLDS = [
  0, 250, 600, 1200, 2200, 3700, 5700, 8200, 11500, 15500,
  20500, 26500, 33500, 42000, 52000, 64000, 78000, 95000, 115000, 140000,
];

export const LEVEL_NAMES: Record<number, string> = {
  1: 'Spark', 2: 'Seeker', 3: 'Challenger', 4: 'Pathfinder', 5: 'Striker',
  6: 'Warrior', 7: 'Guardian', 8: 'Architect', 9: 'Enforcer', 10: 'Legend',
  11: 'Phantom', 12: 'Titan', 13: 'Sovereign', 14: 'Ascendant', 15: 'Immortal',
  16: 'Eclipse', 17: 'Ethereal', 18: 'Mythic', 19: 'Transcendent', 20: 'Apex',
};

export function getLevelInfo(totalXP: number) {
  let level = 1;
  for (let i = 0; i < LEVEL_THRESHOLDS.length; i++) {
    if (totalXP >= LEVEL_THRESHOLDS[i]) level = i + 1;
    else break;
  }
  level = Math.min(level, LEVEL_THRESHOLDS.length);
  const currentThreshold = LEVEL_THRESHOLDS[level - 1] ?? 0;
  const nextThreshold = LEVEL_THRESHOLDS[level];
  if (nextThreshold === undefined) {
    return { level, progress: 1.0, levelName: LEVEL_NAMES[level] ?? 'Apex' };
  }
  const xpInLevel = totalXP - currentThreshold;
  const xpForNext = nextThreshold - currentThreshold;
  return {
    level,
    progress: Math.min(xpInLevel / xpForNext, 1.0),
    levelName: LEVEL_NAMES[level] ?? `L${level}`,
  };
}
