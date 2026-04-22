import { BorderRadius, Spacing, Typography } from '@/constants/theme';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useStore } from '@/store/useStore';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';

export const FocusWidget = React.memo(function FocusWidget() {
  const router = useRouter();
  const colors = useThemeColors();
  // Granular selectors: only subscribe to the primitives actually rendered.
  // Subscribing to the full focusSession object causes re-renders on every field change
  // (e.g. pomodoroTimeLeft, lastStartTime) even when the displayed values haven't changed.
  const isActive = useStore(s => s.focusSession.isActive);
  const totalSecondsToday = useStore(s => s.focusSession.totalSecondsToday);
  const focusGoalHours = useStore(s => s.focusGoalHours);
  const setFocusGoal = useStore(s => s.actions.setFocusGoal);
  const toggleFocusSession = useStore(s => s.actions.toggleFocusSession);
  const pulse = useSharedValue(1);

  useEffect(() => {
    // FocusWidget drives the pulse animation.
    // The actual timer interval lives globally in hooks/useFocusTimer.ts
    // to ensure shared accumulation across all screens.
    if (isActive) {
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
  }, [isActive]);

  const animatedRingStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
    borderColor: isActive ? colors.primary : colors.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
    borderWidth: isActive ? 4 : 2,
    backgroundColor: isActive ? colors.primaryTransparent : colors.isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
    shadowColor: isActive ? colors.primary : 'transparent',
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
    // U-M4: Clamp to 0.1 hours (6 mins) minimum to avoid division by zero.
    const goalSeconds = Math.max(0.1, focusGoalHours) * 3600;
    return Math.min(100, Math.floor((totalSecondsToday / goalSeconds) * 100));
  };

  const cycleGoal = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const goals = [4, 6, 8, 10, 12];
    const currentIndex = goals.indexOf(focusGoalHours);
    // If current goal isn't in the preset array (custom value), snap to the first preset
    const nextGoal = goals[(currentIndex === -1 ? 0 : (currentIndex + 1) % goals.length)];
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
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <TouchableOpacity
                onPress={() => router.push('/focus-room')}
                accessibilityLabel="Enter live Monk Mode room"
                accessibilityRole="button"
                style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, backgroundColor: colors.primaryTransparent }}
              >
                <Ionicons name="flame" size={14} color={colors.primary} />
                <Text style={{ color: colors.primary, fontFamily: 'Outfit-Medium', fontSize: 12, marginLeft: 4 }}>Monk Mode</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={cycleGoal}
                accessibilityLabel={`Focus goal: ${focusGoalHours} hours. Tap to change.`}
                accessibilityRole="button"
              >
                <Text style={[styles.percentage, { color: colors.primary }]}>
                  {calculatePercentage()}%
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handleToggle}
            style={styles.content}
            accessibilityLabel={isActive ? 'Stop focus session' : 'Start focus session'}
            accessibilityRole="button"
          >
            <Animated.View style={[styles.ring, animatedRingStyle]}>
              <View style={styles.innerContent}>
                <Text style={[styles.timeValue, { color: colors.text }]}>{formatTime(totalSecondsToday)}</Text>
                <Text style={[styles.timeLabel, { color: colors.textSecondary }]}>{isActive ? 'Stop' : 'Start'}</Text>
              </View>
            </Animated.View>
          </TouchableOpacity>
        </BlurView>
      </TouchableOpacity>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    height: 200,
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
    marginBottom: Spacing.md,
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
