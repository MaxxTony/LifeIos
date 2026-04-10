import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import { Colors, BorderRadius, Spacing } from '@/constants/theme';

interface GlassCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

export function GlassCard({ children, style }: GlassCardProps) {
  return (
    <View style={[styles.container, style]}>
      <BlurView intensity={20} tint="dark" style={styles.blur}>
        <View style={styles.inner}>
          {children}
        </View>
      </BlurView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    backgroundColor: Colors.dark.card + '80', // Semi-transparent
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  blur: {
    flex: 1,
  },
  inner: {
    padding: Spacing.md,
  },
});
