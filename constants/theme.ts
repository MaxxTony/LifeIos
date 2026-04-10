import { Platform } from 'react-native';

export const Colors = {
  dark: {
    background: '#0B0B0F',
    card: '#14141A',
    border: '#1F1F2A',
    primary: '#7C5CFF',
    secondary: '#5B8CFF',
    text: '#FFFFFF',
    textSecondary: '#A1A1AA',
    tint: '#7C5CFF',
    icon: '#FFFFFF',
    tabIconDefault: '#4F4F5A',
    tabIconSelected: '#7C5CFF',
    gradient: ['#7C5CFF', '#5B8CFF'] as const,
    danger: '#FF4B4B',
    success: '#00D68F',
  },
  light: {
    background: '#FFFFFF',
    card: '#F5F5F7',
    border: '#E5E7EB',
    primary: '#6D5DF6',
    secondary: '#4F8CFF',
    text: '#111827',
    textSecondary: '#6B7280',
    tint: '#6D5DF6',
    icon: '#111827',
    tabIconDefault: '#9CA3AF',
    tabIconSelected: '#6D5DF6',
    gradient: ['#6D5DF6', '#4F8CFF'] as const,
    danger: '#EF4444',
    success: '#10B981',
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
    fontFamily: 'Inter-SemiBold',
    fontSize: 20,
    fontWeight: '600' as const,
  },
  body: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    fontWeight: '400' as const,
  },
  caption: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    fontWeight: '400' as const,
    color: Colors.dark.textSecondary,
  },
};
