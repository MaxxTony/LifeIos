import { BorderRadius, Spacing, Typography } from '@/constants/theme';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useStore } from '@/store/useStore';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { AppState, AppStateStatus, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';

export function FocusWidget() {
  const router = useRouter();
  const colors = useThemeColors();
  const { focusSession, focusGoalHours, setFocusGoal, toggleFocusSession, updateFocusTime } = useStore();
  const pulse = useSharedValue(1);

  // FIX L-8: Added updateFocusTime to dependency array to avoid stale closure
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;
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
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [focusSession.isActive, updateFocusTime]); // FIX L-8

  // FIX H-5: Sync elapsed time when app returns to foreground
  // setInterval is paused by iOS in background — without this, returning from background
  // would credit all background time in a single tick (time warp bug)
  useEffect(() => {
    const handleAppStateChange = (nextState: AppStateStatus) => {
      if (nextState === 'active' && focusSession.isActive) {
        updateFocusTime();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, [focusSession.isActive, updateFocusTime]);

  const animatedRingStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
    borderColor: focusSession.isActive ? colors.primary : 'rgba(255,255,255,0.08)',
    borderWidth: focusSession.isActive ? 4 : 2,
    backgroundColor: focusSession.isActive ? colors.primaryMuted : 'rgba(255,255,255,0.02)',
  }));

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    const h = String(hrs).padStart(2, '0');
    const m = String(mins).padStart(2, '0');
    const s = String(secs).padStart(2, '0');

    return `${h}:${m}:${s}`;
  };

  const calculatePercentage = () => {
    const goalSeconds = focusGoalHours * 3600;
    return Math.min(100, Math.floor((focusSession.totalSecondsToday / goalSeconds) * 100));
  };

  const cycleGoal = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const goals = [4, 6, 8, 10, 12];
    const currentIndex = goals.indexOf(focusGoalHours);
    const nextGoal = goals[(currentIndex + 1) % goals.length];
    setFocusGoal(nextGoal);
  };

  const handleToggle = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    toggleFocusSession();
  };

  const handleOpenDetail = () => {
    router.push('/focus-detail');
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        activeOpacity={1}
        onPress={handleOpenDetail}
        style={{ flex: 1 }}
        accessibilityLabel="Open focus detail"
        accessibilityRole="button"
      >
        <BlurView intensity={20} tint="dark" style={styles.blur}>
          <View style={styles.header}>
            <Text style={styles.title}>Daily Focus</Text>
            <TouchableOpacity
              onPress={cycleGoal}
              accessibilityLabel={`Focus goal: ${focusGoalHours} hours. Tap to change.`}
              accessibilityRole="button"
            >
              <Text style={[styles.percentage, { color: colors.primary }]}>
                {calculatePercentage()}% · {focusGoalHours}h Goal
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handleToggle}
            style={styles.content}
            accessibilityLabel={focusSession.isActive ? 'Stop focus session' : 'Start focus session'}
            accessibilityRole="button"
          >
            <Animated.View style={[styles.ring, animatedRingStyle]}>
              <View style={styles.innerContent}>
                <Text style={styles.timeValue}>{formatTime(focusSession.totalSecondsToday)}</Text>
                <Text style={styles.timeLabel}>{focusSession.isActive ? 'Stop' : 'Start'}</Text>
              </View>
            </Animated.View>
          </TouchableOpacity>
        </BlurView>
      </TouchableOpacity>
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
    color: '#FFF',
    fontWeight: '600',
    fontSize: 12,
  },
  percentage: {
    ...Typography.caption,
    fontSize: 12,
    fontWeight: 'bold',
  },
  content: {
    alignSelf: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  ring: {
    width: 130,
    height: 130,
    borderRadius: 65,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 15,
    shadowOpacity: 0.4,
  },
  innerContent: {
    alignItems: 'center',
  },
  timeValue: {
    ...Typography.h1,
    color: '#FFF',
    fontSize: 24,
    marginBottom: -2,
  },
  timeLabel: {
    ...Typography.labelSmall,
    color: 'rgba(255,255,255,0.7)',
    fontSize: 9,
  },
});
