import { Platform } from 'react-native';

export const Colors = {
  dark: {
    background: '#020617', // Deep sapphire black
    card: '#0F172A',
    border: '#1E293B',
    primary: '#818CF8', // Brighter indigo
    secondary: '#38BDF8', // Brighter sky
    text: '#F8FAFC',
    textSecondary: '#94A3B8', // Crisp slate
    tint: '#818CF8',
    icon: '#F8FAFC',
    tabIconDefault: '#475569',
    tabIconSelected: '#818CF8',
    gradient: ['#818CF8', '#38BDF8'] as const,
    danger: '#FB7185',
    success: '#34D399',
    warning: '#FBBF24',
  },
  light: {
    background: '#FFFFFF',
    card: '#F8FAFC',
    border: '#E2E8F0',
    primary: '#4F46E5', // Punchy indigo
    secondary: '#0EA5E9', // Punchy sky
    text: '#0F172A', // Rich deep black
    textSecondary: '#475569', // Strong slate gray
    tint: '#4F46E5',
    icon: '#0F172A',
    tabIconDefault: '#94A3B8',
    tabIconSelected: '#4F46E5',
    gradient: ['#4F46E5', '#0EA5E9'] as const,
    danger: '#E11D48',
    success: '#059669',
    warning: '#B45309', // WCAG AA PASS: Darker amber for contrast
  },
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const BorderRadius = {
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  full: 9999,
};

export const Typography = {
  h1Hero: {
    fontFamily: 'Outfit-Bold',
    fontSize: 44,
    fontWeight: '900' as const,
    letterSpacing: -1.5,
  },
  h1: {
    fontFamily: 'Outfit-Bold',
    fontSize: 32,
    fontWeight: '700' as const,
  },
  h2: {
    fontFamily: 'Outfit-Bold',
    fontSize: 24,
    fontWeight: '700' as const,
  },
  h3: {
    fontFamily: 'Outfit-Bold',
    fontSize: 20,
    fontWeight: '700' as const,
  },
  bodyLarge: {
    fontFamily: 'Inter-SemiBold', // FIX M-11: Inter-Medium not loaded — use Inter-SemiBold
    fontSize: 18,
    lineHeight: 26,
  },
  body: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    fontWeight: '400' as const,
  },
  bodyBold: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    fontWeight: '600' as const,
  },
  caption: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    fontWeight: '400' as const,
    color: '#A1A1AA',
  },
  labelSmall: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 12, // Standardized to 4pt grid
    textTransform: 'uppercase' as const,
    letterSpacing: 1,
  }
};

export const DashboardTheme = {
  dark: {
    bg: ['#020617', '#0F172A'] as const,
    glow1: '#6366F130',
    glow2: '#0EA5E920',
  },
  light: {
    bg: ['#FFFFFF', '#F1F5F9'] as const,
    glow1: '#6366F120',
    glow2: '#0EA5E915',
  },
};

// MIN-05 FIX: Cross-platform shadow helper — use instead of iOS-only shadow* props
export const Shadows = {
  sm: Platform.select({
    ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6 },
    android: { elevation: 2 },
    default: {},
  }),
  md: Platform.select({
    ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 10 },
    android: { elevation: 4 },
    default: {},
  }),
  lg: Platform.select({
    ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.12, shadowRadius: 16 },
    android: { elevation: 8 },
    default: {},
  }),
};
