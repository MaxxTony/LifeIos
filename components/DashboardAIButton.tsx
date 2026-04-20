import { IconSymbol } from '@/components/ui/icon-symbol';
import { Typography } from '@/constants/theme';
import { useThemeColors } from '@/hooks/useThemeColors';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';

// O6 FIX: Wrapped in React.memo. This component has no props and its internal
// state (router, colors) doesn't change every second, so without memo it was
// needlessly re-rendering on every focus timer tick.
export const DashboardAIButton = React.memo(function DashboardAIButton() {
  const router = useRouter();
  const colors = useThemeColors();
  const glow = useSharedValue(0.8);

  useEffect(() => {
    glow.value = withRepeat(
      withSequence(
        withTiming(1.2, { duration: 1500 }),
        withTiming(0.8, { duration: 1500 })
      ),
      -1,
      true
    );
  }, []);

  const glowStyle = useAnimatedStyle(() => ({
    transform: [{ scale: glow.value }],
    opacity: (glow.value - 0.5) * 0.5,
  }));

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.glowRing, { backgroundColor: colors.primary, shadowColor: colors.primary }, glowStyle]} />

      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => router.push('/ai-chat')}
        style={[styles.buttonWrap, { borderColor: colors.isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)' }]}
        accessibilityLabel="Consult LifeOS AI Assistant"
        accessibilityRole="button"
      >
        <LinearGradient
          colors={colors.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.gradient}
        >
          <IconSymbol name="sparkles" size={20} color="#FFF" />
          <Text style={[styles.text, { color: '#FFF' }]}>LifeOS AI</Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 10,
  },
  glowRing: {
    position: 'absolute',
    width: 200,
    height: 60,
    borderRadius: 30,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 20,
    elevation: 10,
  },
  buttonWrap: {
    width: 180,
    height: 52,
    borderRadius: 26,
    overflow: 'hidden',
    borderWidth: 1,
  },
  gradient: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  text: {
    ...Typography.h3,
    fontSize: 16,
    fontWeight: '800',
  }
});
