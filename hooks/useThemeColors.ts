import { useColorScheme } from 'react-native';
import { useStore } from '@/store/useStore';
import { Colors, DashboardTheme } from '@/constants/theme';

const COLOR_MAP: Record<string, string> = {
  'Royal': '#7C5CFF',
  'Azure': '#5B8CFF',
  'Neo': '#00D68F',
  'Coral': '#FF4B4B',
  'Sunset': '#FFB347',
  'Candy': '#FF69B4',
  'Cyber': '#00CED1',
  'Emerald': '#10B981',
  'Violet': '#8B5CF6',
  'Crimson': '#DC2626',
  'Amber': '#D97706',
  'Rose': '#E11D48',
};

/**
 * Helper to ensure we have a valid 6-digit hex color
 */
function normalizeHex(color: string | null | undefined): string {
  const fallback = '#7C5CFF';
  if (!color) return fallback;
  
  let hex = color;
  if (!color.startsWith('#')) {
    hex = COLOR_MAP[color] || fallback;
  }
  
  // Expand 3-digit hex to 6-digit (#F00 -> #FF0000)
  if (hex.length === 4) {
    return `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`;
  }
  
  // If it's 8 digits (#RRGGBBAA), truncate to 6 digits (#RRGGBB)
  if (hex.length > 7) {
    return hex.slice(0, 7);
  }
  
  return hex;
}

/**
 * Helper to adjust hex color brightness
 */
function adjustBrightness(hex: string, amt: number) {
  const normalized = normalizeHex(hex);
  let color = normalized.slice(1);
  
  // Handle 3-digit hex
  if (color.length === 3) {
    color = color.split('').map(c => c + c).join('');
  }

  const num = parseInt(color, 16);
  if (isNaN(num)) return '#000000';

  let r = (num >> 16) + amt;
  let g = ((num >> 8) & 0x00FF) + amt;
  let b = (num & 0x0000FF) + amt;

  r = Math.max(0, Math.min(255, r));
  g = Math.max(0, Math.min(255, g));
  b = Math.max(0, Math.min(255, b));

  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

export function useThemeColors() {
  const systemColorScheme = useColorScheme();
  const themePreference = useStore(s => s.themePreference);
  const storeAccentColor = useStore(s => s.accentColor);

  const theme = themePreference === 'system'
    ? (systemColorScheme === 'dark' ? 'dark' : 'light')
    : themePreference;

  const isDark = theme === 'dark';
  const baseColors = Colors[theme];
  
  const accentColor = normalizeHex(storeAccentColor);
  
  // Dynamic secondary is slightly lighter in dark mode, slightly darker in light mode
  const secondaryColor = adjustBrightness(accentColor, isDark ? 40 : -30);
  const gradient: [string, string] = [accentColor, secondaryColor];

  // Make DashboardTheme dynamic based on accent
  const baseDashboard = DashboardTheme[isDark ? 'dark' : 'light'];
  const dynamicDashboardTheme = {
    ...baseDashboard,
    glow1: `${accentColor}${isDark ? '30' : '20'}`, // Dynamic glow based on accent
    glow2: `${secondaryColor}${isDark ? '20' : '15'}`, // Secondary glow
  };

  return {
    ...baseColors,
    primary: accentColor,
    secondary: secondaryColor,
    tint: accentColor,
    tabIconSelected: accentColor,
    tabIconDefault: isDark ? '#475569' : '#94A3B8',
    gradient,

    // Transparent variants for glows/backgrounds
    primaryTransparent: `${accentColor}15`,
    primaryMuted: `${accentColor}30`,
    primaryVeryTransparent: `${accentColor}08`,

    isDark,
    dashboardTheme: dynamicDashboardTheme,
  };
}
