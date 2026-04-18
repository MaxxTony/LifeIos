import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, { 
  useAnimatedStyle, 
  useSharedValue, 
  withRepeat, 
  withTiming, 
  withDelay,
  Easing
} from 'react-native-reanimated';
import { useThemeColors } from '@/hooks/useThemeColors';

const BARS = 5;

export const VoiceWaves = ({ isActive }: { isActive: boolean }) => {
  return (
    <View 
      style={styles.container}
      accessibilityLabel="Voice activity feedback waves"
      accessibilityRole="none"
      importantForAccessibility="yes"
    >
      {[...Array(BARS)].map((_, i) => (
        <WaveBar key={i} index={i} isActive={isActive} />
      ))}
    </View>
  );
};

const WaveBar = ({ index, isActive }: { index: number; isActive: boolean }) => {
  const { primary } = useThemeColors();
  const height = useSharedValue(4);

  useEffect(() => {
    if (isActive) {
      height.value = withDelay(
        index * 100,
        withRepeat(
          withTiming(20 + Math.random() * 20, {
            duration: 400 + Math.random() * 400,
            easing: Easing.bezier(0.25, 0.1, 0.25, 1),
          }),
          -1,
          true
        )
      );
    } else {
      height.value = withTiming(4);
    }
  }, [isActive]);

  const animatedStyle = useAnimatedStyle(() => ({
    height: height.value,
    backgroundColor: primary,
  }));

  return <Animated.View style={[styles.bar, animatedStyle]} />;
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    height: 40,
  },
  bar: {
    width: 3,
    borderRadius: 2,
  },
});
