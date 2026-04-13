import { BorderRadius, Spacing, Typography } from '@/constants/theme';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useStore } from '@/store/useStore';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';

export function FocusWidget() {
  const router = useRouter();
  const colors = useThemeColors();
  const { focusSession, focusGoalHours, setFocusGoal, toggleFocusSession } = useStore();
  const pulse = useSharedValue(1);

  useEffect(() => {
    // FocusWidget drives the pulse animation.
    // The actual timer interval lives globally in hooks/useFocusTimer.ts
    // to ensure shared accumulation across all screens.
    if (focusSession.isActive) {
      pulse.value = withRepeat(
        withSequence(
          withTiming(1.03, { duration: 1500 }),
          withTiming(1, { duration: 1500 })
        ),
        -1,
        true
      );
    } else {
      pulse.value = withTiming(1);
    }
  }, [focusSession.isActive]);

  const animatedRingStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
    borderColor: focusSession.isActive ? colors.primary : colors.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
    borderWidth: focusSession.isActive ? 4 : 2,
    backgroundColor: focusSession.isActive ? colors.primaryTransparent : colors.isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
    shadowColor: focusSession.isActive ? colors.primary : 'transparent',
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
    <View style={[styles.container, { borderColor: colors.border }]}>
      <TouchableOpacity
        activeOpacity={1}
        onPress={handleOpenDetail}
        style={{ flex: 1 }}
        accessibilityLabel="Open focus detail"
        accessibilityRole="button"
      >
        <BlurView intensity={20} tint={colors.isDark ? "dark" : "light"} style={styles.blur}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text }]}>Daily Focus</Text>
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
                <Text style={[styles.timeValue, { color: colors.text }]}>{formatTime(focusSession.totalSecondsToday)}</Text>
                <Text style={[styles.timeLabel, { color: colors.textSecondary }]}>{focusSession.isActive ? 'Stop' : 'Start'}</Text>
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
    fontFamily: 'Outfit-Bold',
    fontSize: 13,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  percentage: {
    ...Typography.caption,
    fontSize: 12,
    fontWeight: '800',
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
    fontSize: 24,
    marginBottom: -2,
  },
  timeLabel: {
    ...Typography.labelSmall,
    fontSize: 9,
  },
});
