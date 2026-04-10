import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { useAnimatedStyle, withRepeat, withSequence, withTiming, useSharedValue } from 'react-native-reanimated';
import { Colors, Typography, BorderRadius } from '@/constants/theme';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useRouter } from 'expo-router';

export function DashboardAIButton() {
  const router = useRouter();
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
      <Animated.View style={[styles.glowRing, glowStyle]} />
      
      <TouchableOpacity 
        activeOpacity={0.9}
        onPress={() => router.push('/ai-chat')}
        style={styles.buttonWrap}
      >
        <LinearGradient
          colors={['#7C5CFF', '#5B8CFF']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradient}
        >
          <IconSymbol name="sparkles" size={20} color="#FFF" />
          <Text style={styles.text}>LifeOS AI</Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
}

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
    backgroundColor: '#7C5CFF',
    shadowColor: '#7C5CFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 20,
    zIndex: 0,
  },
  buttonWrap: {
    width: 180,
    height: 52,
    borderRadius: 26,
    overflow: 'hidden',
    zIndex: 1,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
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
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  }
});
