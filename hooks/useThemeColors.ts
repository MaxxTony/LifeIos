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
    tint: accentColor,
    tabIconSelected: accentColor,
    // Add a slightly transparent version for glows/backgrounds
    primaryTransparent: `${accentColor}20`,
    primaryMuted: `${accentColor}40`,
    isDark: theme === 'dark',
  };
}
