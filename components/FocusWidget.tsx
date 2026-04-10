import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { useAnimatedStyle, withRepeat, withSequence, withTiming, useSharedValue, interpolateColor } from 'react-native-reanimated';
import { Colors, Typography, Spacing, BorderRadius } from '@/constants/theme';
import { useStore } from '@/store/useStore';
import { IconSymbol } from '@/components/ui/icon-symbol';

export function FocusWidget() {
  const { focusSession, focusGoalHours, setFocusGoal, toggleFocusSession, updateFocusTime } = useStore();
  const pulse = useSharedValue(1);

  useEffect(() => {
    let interval: any;
    if (focusSession.isActive) {
      pulse.value = withRepeat(
        withSequence(
          withTiming(1.03, { duration: 1500 }),
          withTiming(1, { duration: 1500 })
        ),
        -1,
        true
      );
      interval = setInterval(() => {
        updateFocusTime();
      }, 1000);
    } else {
      pulse.value = withTiming(1);
    }
    return () => clearInterval(interval);
  }, [focusSession.isActive]);

  const animatedRingStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
    borderColor: focusSession.isActive ? Colors.dark.primary : 'rgba(255,255,255,0.1)',
    shadowOpacity: focusSession.isActive ? 0.3 : 0,
    backgroundColor: focusSession.isActive ? 'rgba(124, 92, 255, 0.05)' : 'transparent',
  }));

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return `${hrs}h ${mins}m`;
  };

  const calculatePercentage = () => {
    const goalSeconds = focusGoalHours * 3600;
    return Math.min(100, Math.floor((focusSession.totalSecondsToday / goalSeconds) * 100));
  };

  const cycleGoal = () => {
    // Cycle between 4, 6, 8, 10, 12 hours
    const goals = [4, 6, 8, 10, 12];
    const currentIndex = goals.indexOf(focusGoalHours);
    const nextGoal = goals[(currentIndex + 1) % goals.length];
    setFocusGoal(nextGoal);
  };

  return (
    <View style={styles.container}>
      <BlurView intensity={20} tint="dark" style={styles.blur}>
        <View style={styles.header}>
          <Text style={styles.title}>Daily Focus</Text>
          <TouchableOpacity onPress={cycleGoal}>
            <Text style={styles.percentage}>{calculatePercentage()}% · {focusGoalHours}h Goal</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity 
          activeOpacity={0.8} 
          onPress={toggleFocusSession}
          style={styles.content}
        >
          <Animated.View style={[styles.ring, animatedRingStyle]}>
            <View style={styles.innerContent}>
              <Text style={styles.timeValue}>{formatTime(focusSession.totalSecondsToday)}</Text>
              <Text style={styles.timeLabel}>{focusSession.isActive ? 'Stop' : 'Start'}</Text>
            </View>
          </Animated.View>
        </TouchableOpacity>
      </BlurView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    height: 180,
  },
  blur: {
    flex: 1,
    padding: Spacing.md,
    justifyContent: 'space-between',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    ...Typography.caption,
    color: 'rgba(255,255,255,0.6)',
    fontWeight: '600',
    fontSize: 12,
  },
  percentage: {
    ...Typography.caption,
    color: '#A78BFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  ring: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 6,
    borderStyle: 'solid',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.dark.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 10,
    elevation: 5,
  },
  innerContent: {
    alignItems: 'center',
  },
  timeValue: {
    ...Typography.h2,
    color: '#FFF',
    fontSize: 22,
  },
  timeLabel: {
    ...Typography.caption,
    color: 'rgba(255,255,255,0.4)',
    fontSize: 10,
    textTransform: 'uppercase',
  },
  activeIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 2,
  }
});
