import { useColorScheme } from 'react-native';
import { useStore } from '@/store/useStore';
import { Colors, DashboardTheme } from '@/constants/theme';

/**
 * Helper to adjust hex color brightness
 */
function adjustBrightness(hex: string, amt: number) {
  let color = hex.startsWith('#') ? hex.slice(1) : hex;
  
  // Handle 3-digit hex
  if (color.length === 3) {
    color = color.split('').map(c => c + c).join('');
  }

  const num = parseInt(color, 16);
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
  const { themePreference, accentColor: storeAccentColor } = useStore();

  const theme = themePreference === 'system'
    ? (systemColorScheme === 'dark' ? 'dark' : 'light')
    : themePreference;

  const isDark = theme === 'dark';
  const baseColors = Colors[theme];
  
  const accentColor = storeAccentColor || '#7C5CFF';
  
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
