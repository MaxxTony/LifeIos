import React from 'react';
import { TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { useThemeColors } from '@/hooks/useThemeColors';
import { IconSymbol } from './ui/icon-symbol';
import { useRouter } from 'expo-router';

export function LiquidGlassBackButton() {
  const router = useRouter();
  const { text, isDark } = useThemeColors();

  return (
    <TouchableOpacity 
      onPress={() => router.back()}
      style={[
        styles.container, 
        { 
          backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)',
          borderColor: isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.1)'
        }
      ]}
      activeOpacity={0.7}
      accessibilityLabel="Go back"
      accessibilityRole="button"
    >
      <BlurView 
        intensity={30} 
        tint={isDark ? "dark" : "light"} 
        style={styles.blur}
      >
        <IconSymbol 
          name="chevron.left" 
          size={24} 
          color={text} 
        />
      </BlurView>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
    borderWidth: 1,
    marginLeft: Platform.OS === 'ios' ? 0 : 8,
  },
  blur: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
