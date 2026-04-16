import React from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { useStore } from '@/store/useStore';
import { useThemeColors } from '@/hooks/useThemeColors';
import { Spacing, Typography } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export function OfflineBanner() {
  const isOffline = useStore(s => s.syncStatus.isOffline);
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  
  // Animation logic can be added here if needed, 
  // but for now a simple conditional render is cleaner.
  if (!isOffline) return null;

  return (
    <View style={[
      styles.container, 
      { 
        backgroundColor: colors.danger, 
        paddingTop: insets.top > 0 ? insets.top : Spacing.sm 
      }
    ]}>
      <View style={styles.content}>
        <Ionicons name="cloud-offline" size={14} color="#FFF" />
        <Text style={styles.text}>You're currently offline. Some features may be limited.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    paddingBottom: Spacing.xs,
    zIndex: 9999,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 4,
  },
  text: {
    ...Typography.labelSmall,
    color: '#FFF',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'none',
  }
});
