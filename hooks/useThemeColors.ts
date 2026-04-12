import { useColorScheme } from 'react-native';
import { useStore } from '@/store/useStore';
import { Colors } from '@/constants/theme';

export function useThemeColors() {
  const systemColorScheme = useColorScheme();
  const { themePreference, accentColor } = useStore();

  const theme = themePreference === 'system'
    ? (systemColorScheme === 'dark' ? 'dark' : 'light')
    : themePreference;

  const baseColors = Colors[theme];

  return {
    ...baseColors,
    // Override primary and related colors with user's selected accent
    primary: accentColor,
    // FIX L-7: Expose secondary so DashboardAIButton gradient renders correctly
    secondary: baseColors.secondary,
    tint: accentColor,
    tabIconSelected: accentColor,
    // Transparent variants for glows/backgrounds
    primaryTransparent: `${accentColor}20`,
    primaryMuted: `${accentColor}40`,
    isDark: theme === 'dark',
  };
}
