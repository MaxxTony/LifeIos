import { BorderRadius, Spacing } from '@/constants/theme';
import { useThemeColors } from '@/hooks/useThemeColors';
import { BlurView } from '@/components/BlurView';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { StyleSheet, View, ViewStyle, StyleProp } from 'react-native';

interface GlassCardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function GlassCard({ children, style }: GlassCardProps) {
  const colors = useThemeColors();
  
  return (
    <View style={[
      styles.container, 
      { 
        backgroundColor: colors.isDark ? (colors.background + '40') : 'rgba(255, 255, 255, 0.7)',
        borderColor: colors.border
      }, 
      style
    ]}>
      <BlurView 
        intensity={colors.isDark ? 25 : 30} 
        tint={colors.isDark ? "dark" : "light"} 
        style={[styles.blur, { borderRadius: BorderRadius.md }]}
      >
        <LinearGradient
          colors={colors.isDark ? ['rgba(255,255,255,0.05)', 'transparent'] : ['rgba(255,255,255,0.4)', 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[StyleSheet.absoluteFill, { borderRadius: BorderRadius.md }]}
        />

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
    borderWidth: 1,
  },
  blur: {
    flex: 1,
  },
  inner: {
    padding: Spacing.md,
  },
});
