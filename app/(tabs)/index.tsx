import { AIInsightCard } from '@/components/AIInsightCard';
import { DailyTasksWidget } from '@/components/DailyTasksWidget';
import { DashboardAIButton } from '@/components/DashboardAIButton';
import { FocusWidget } from '@/components/FocusWidget';
import { HabitGrid } from '@/components/HabitGrid';
import { MoodFeedbackOverlay } from '@/components/MoodFeedbackOverlay';
import { MoodTrend } from '@/components/MoodTrend';
import { OnboardingWalkthrough } from '@/components/Onboarding/OnboardingWalkthrough';
import { QuestDashboard } from '@/components/QuestDashboard';
import { StreakCelebration } from '@/components/StreakCelebration';
import { XPPopUp } from '@/components/XPPopUp';
import { BorderRadius, Spacing, Typography } from '@/constants/theme';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useStore } from '@/store/useStore';
import { Ionicons } from '@expo/vector-icons';
import { getTodayLocal } from '@/utils/dateUtils';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { AppState, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { FadeIn, FadeOut, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

const getGreeting = (): { text: string; icon: 'sunny' | 'partly-sunny' | 'cloudy-night' | 'moon' } => {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return { text: 'Good morning', icon: 'sunny' };
  if (hour >= 12 && hour < 17) return { text: 'Good afternoon', icon: 'partly-sunny' };
  if (hour >= 17 && hour < 21) return { text: 'Good evening', icon: 'cloudy-night' };
  return { text: 'Good night', icon: 'moon' };
};

function SkeletonBlock({ width, height, borderRadius = 12 }: { width: number | string; height: number; borderRadius?: number }) {
  const colors = useThemeColors();
  const opacity = useSharedValue(0.4);

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.9, { duration: 900 }),
        withTiming(0.4, { duration: 900 })
      ),
      -1, // Infinite loop
      true // Reverse not needed strictly if we sequence it back and forth, but true works. Actually sequence has 0.9 and 0.4, so false is fine since it seamlessly wraps.
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      opacity: opacity.value,
    };
  });

  const base = colors.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)';

  return (
    <Animated.View
      style={[
        {
          width: width as any,
          height,
          borderRadius,
          backgroundColor: base,
        },
        animatedStyle
      ]}
    />
  );
}

function HomeSkeleton() {
  const colors = useThemeColors();
  return (
    <View style={skeletonStyles.container}>
      {/* Header skeleton */}
      <View style={skeletonStyles.headerSk}>
        <SkeletonBlock width={100} height={12} borderRadius={6} />
        <View style={{ marginTop: 8 }}>
          <SkeletonBlock width={180} height={28} borderRadius={10} />
        </View>
      </View>
      {/* Card skeletons */}
      {[180, 260, 160, 200].map((h, i) => (
        <View key={i} style={[skeletonStyles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <SkeletonBlock width="40%" height={13} borderRadius={6} />
          <View style={{ marginTop: 12 }}>
            <SkeletonBlock width="100%" height={h - 50} borderRadius={16} />
          </View>
        </View>
      ))}
    </View>
  );
}

const skeletonStyles = StyleSheet.create({
  container: { padding: Spacing.md, gap: Spacing.lg },
  headerSk: { marginBottom: Spacing.md, paddingHorizontal: 4 },
  card: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 16,
  },
});


import { getLevelProgress } from '@/store/helpers';

export default function HomeScreen() {
  const userName = useStore(s => s.userName);
  const isHydrated = useStore(s => s._hasHydrated);
  const colors = useThemeColors();
  const { dashboardTheme } = colors;
  const greeting = getGreeting();
  // PH-1 PERFORMANCE: Subscribe directly to stable primitives (level, xp)
  // instead of useProfileStats() to avoid re-renderingทุก second on timer ticks.
  const level = useStore(s => s.level);
  const totalXP = useStore(s => s.totalXP);
  const { progress: xpProgress } = getLevelProgress(totalXP);
  // UI-001/007: Detect new user so we can show CTAs instead of empty/0% widgets.
  const taskCount = useStore(s => s.tasks.length);
  const habitCount = useStore(s => s.habits.length);
  const isNewUser = taskCount === 0 && habitCount === 0;

  const router = useRouter();
  const generateDailyQuests = useStore(s => s.actions.generateDailyQuests);

  useEffect(() => {
    if (isHydrated) {
      generateDailyQuests();
    }
  }, [isHydrated]);

  // T-27 FIX: Midnight Crossing Refresh
  const [lastCheckDate, setLastCheckDate] = useState(getTodayLocal());
  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (nextAppState === 'active') {
        const today = getTodayLocal();
        if (today !== lastCheckDate) {
          // Date changed! Refresh stats and tasks
          setLastCheckDate(today);
          useStore.getState().actions.checkMissedTasks();
          generateDailyQuests();
        }
      }
    });
    return () => subscription.remove();
  }, [lastCheckDate]);

  // C-13: Watchdog — if persisted storage is corrupt or the rehydrate promise
  // never resolves, users were stuck on the skeleton forever. After 10s we
  // show a recovery screen that offers a retry and a "reset local data" fallback.
  const [hydrationStuck, setHydrationStuck] = useState(false);
  useEffect(() => {
    if (isHydrated) return;
    const t = setTimeout(() => setHydrationStuck(true), 10000);
    return () => clearTimeout(t);
  }, [isHydrated]);

  // Show skeleton while local store hasn't hydrated yet.
  if (!isHydrated) {
    if (hydrationStuck) {
      return (
        <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', padding: Spacing.xl }]}>
          <Text style={{ ...Typography.h2, color: colors.text, textAlign: 'center', marginBottom: 12 }}>
            Taking longer than usual
          </Text>
          <Text style={{ ...Typography.body, color: colors.textSecondary, textAlign: 'center', marginBottom: 24 }}>
            We couldn't load your local data. Try again, or reset if the problem persists.
          </Text>
          <TouchableOpacity
            style={{ backgroundColor: colors.primary, padding: 14, borderRadius: BorderRadius.full, alignItems: 'center', marginBottom: 12 }}
            onPress={() => setHydrationStuck(false)}
          >
            <Text style={{ color: '#FFF', fontFamily: 'Outfit-Bold', fontSize: 16 }}>Retry</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={{ padding: 14, borderRadius: BorderRadius.full, alignItems: 'center', borderWidth: 1, borderColor: colors.border }}
            onPress={async () => {
              try { await AsyncStorage.removeItem('lifeos-storage'); } catch (_) { }
              useStore.setState({ _hasHydrated: true });
            }}
          >
            <Text style={{ color: colors.text, fontFamily: 'Outfit-Bold', fontSize: 16 }}>Reset local data</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return <HomeSkeleton />;
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Background with a subtle gradient/texture feel */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <LinearGradient
          colors={dashboardTheme.bg}
          style={StyleSheet.absoluteFill}
        />
        <View style={[styles.glowBackground, { top: -100, right: -100, backgroundColor: dashboardTheme.glow1 }]} />
        <View style={[styles.glowBackground, { bottom: -150, left: -150, backgroundColor: dashboardTheme.glow2 }]} />
      </View>

      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <Animated.ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          scrollEventThrottle={16}
        >
          {/* Header Content (previously ListHeaderComponent) */}
          <View style={styles.header}>
            <View style={styles.headerTopRow}>
              <View style={styles.greetingRow}>
                <Ionicons
                  name={greeting.icon}
                  size={14}
                  color={colors.textSecondary}
                  style={{ marginRight: 6 }}
                />
                <Text style={[styles.greeting, { color: colors.textSecondary }]}>
                  {greeting.text},
                </Text>
              </View>

              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => router.push('/(tabs)/profile')}
                style={[styles.xpHeaderContainer, { backgroundColor: colors.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)', borderColor: colors.border }]}
                accessibilityLabel={`Level ${level}, ${Math.round(xpProgress * 100)}% to next level. Tap to view profile.`}
                accessibilityRole="button"
              >
                <View style={styles.xpInfo}>
                  <Text style={[styles.levelLabel, { color: colors.text }]}>LVL {level}</Text>
                  <View style={styles.xpBarContainer}>
                    <View style={[styles.xpBarBg, { backgroundColor: colors.isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }]}>
                      <View style={[styles.xpBarFill, { width: `${xpProgress * 100}%`, backgroundColor: colors.primary }]} />
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            </View>

            <Text style={[styles.userName, { color: colors.text }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>
              {userName ? `${userName}!` : 'there!'}
            </Text>


          </View>

          {/* Dashboard Widgets */}
          {isNewUser && (
            <View style={[styles.newUserBanner, { backgroundColor: colors.primaryTransparent, borderColor: colors.primary + '40' }]}>
              <Text style={[styles.newUserTitle, { color: colors.text }]}>Welcome to LifeOS!</Text>
              <Text style={[styles.newUserSub, { color: colors.textSecondary }]}>
                Set up your first habit and task to start building momentum.
              </Text>
              <View style={styles.newUserActions}>
                <TouchableOpacity
                  style={[styles.newUserBtn, { backgroundColor: colors.primary }]}
                  onPress={() => router.push('/all-habits' as any)}
                  accessibilityLabel="Add your first habit"
                  accessibilityRole="button"
                >
                  <Text style={styles.newUserBtnText}>+ Add Habit</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.newUserBtn, { backgroundColor: colors.primary }]}
                  onPress={() => router.push('/all-tasks' as any)}
                  accessibilityLabel="Add your first task"
                  accessibilityRole="button"
                >
                  <Text style={styles.newUserBtnText}>+ Add Task</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
          <AIInsightCard />
          <View style={{ marginBottom: Spacing.lg }}>
            <QuestDashboard />
          </View>
          <View style={{ marginBottom: Spacing.lg }}>
            <FocusWidget />
          </View>
          <View style={{ marginBottom: Spacing.lg }}>
            <DailyTasksWidget />
          </View>
          <View style={{ marginBottom: Spacing.lg }}>
            <HabitGrid />
          </View>
          <View style={{ marginBottom: Spacing.lg }}>
            <MoodTrend />
          </View>
          <View style={[styles.aiSection, { marginBottom: Spacing.lg }]}>
            <DashboardAIButton />
          </View>

          {/* Footer Spacer */}
          <View style={{ height: 40 }} />
        </Animated.ScrollView>

        {/* Rewards Layer (Persistent) */}
        <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
          <OnboardingWalkthrough />
          <StreakCelebration />
          <XPPopUp />
          <MoodFeedbackOverlay />
        </View>
      </SafeAreaView>
    </View>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.md,
    paddingBottom: 100,
  },
  glowBackground: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    opacity: 0.35,
  },
  header: {
    marginBottom: Spacing.xl,
    paddingHorizontal: 4,
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  greetingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  greeting: {
    ...Typography.body,
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  userName: {
    ...Typography.h1Hero,
    fontSize: 34,
    lineHeight: 42,
  },
  newUserBanner: {
    borderRadius: 16,
    borderWidth: 1,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  newUserTitle: {
    fontFamily: 'Outfit-Bold',
    fontSize: 18,
    marginBottom: 6,
  },
  newUserSub: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: Spacing.md,
  },
  newUserActions: {
    flexDirection: 'row',
    gap: 10,
  },
  newUserBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  newUserBtnText: {
    color: '#fff',
    fontFamily: 'Outfit-Bold',
    fontSize: 14,
  },
  aiSection: {
    alignItems: 'center',
    marginTop: Spacing.md,
  },
  xpHeaderContainer: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
    minWidth: 100,
  },
  xpInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  levelLabel: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  xpBarContainer: {
    width: 60,
  },
  xpBarBg: {
    height: 4,
    width: '100%',
    borderRadius: 2,
    overflow: 'hidden',
  },
  xpBarFill: {
    height: '100%',
    borderRadius: 2,
  },

});
