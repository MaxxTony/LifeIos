import { useColorScheme } from 'react-native';
import { useStore } from '@/store/useStore';
import { Colors, DashboardTheme } from '@/constants/theme';

export function useThemeColors() {
  const systemColorScheme = useColorScheme();
  const { themePreference, accentColor } = useStore();

  const theme = themePreference === 'system'
    ? (systemColorScheme === 'dark' ? 'dark' : 'light')
    : themePreference;

  const isDark = theme === 'dark';
  const baseColors = Colors[theme];
  const dashboardTheme = DashboardTheme[isDark ? 'dark' : 'light'];

  return {
    ...baseColors,
    // Override primary and related colors with user's selected accent
    primary: accentColor,
    secondary: baseColors.secondary,
    tint: accentColor,
    tabIconSelected: accentColor,

    // Transparent variants for glows/backgrounds
    primaryTransparent: `${accentColor}15`,
    primaryMuted: `${accentColor}30`,
    primaryVeryTransparent: `${accentColor}08`,

    isDark,
    dashboardTheme,
  };
}
