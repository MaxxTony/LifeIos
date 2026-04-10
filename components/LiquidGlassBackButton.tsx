import React from 'react';
import { TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { Colors, BorderRadius } from '@/constants/theme';
import { IconSymbol } from './ui/icon-symbol';
import { useRouter } from 'expo-router';

export function LiquidGlassBackButton() {
  const router = useRouter();

  return (
    <TouchableOpacity 
      onPress={() => router.back()}
      style={styles.container}
      activeOpacity={0.7}
    >
      <BlurView intensity={30} tint="dark" style={styles.blur}>
        <IconSymbol 
          name="chevron.left" 
          size={24} 
          color={Colors.dark.text} 
        />
      </BlurView>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    marginLeft: Platform.OS === 'ios' ? 0 : 8,
  },
  blur: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
