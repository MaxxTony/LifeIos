import { DailyHighlightModal } from '@/components/DailyHighlightModal';
import { DailyTasksWidget } from '@/components/DailyTasksWidget';
import { EmailVerificationBanner } from '@/components/EmailVerificationBanner';
import { FocusWidget } from '@/components/FocusWidget';
import { HabitGrid } from '@/components/HabitGrid';
import { MoodFeedbackOverlay } from '@/components/MoodFeedbackOverlay';
import { MoodTrend } from '@/components/MoodTrend';
import { OnboardingWalkthrough } from '@/components/Onboarding/OnboardingWalkthrough';
import { QuestDashboard } from '@/components/QuestDashboard';
import { SmartAIFAB } from '@/components/SmartAIFAB';
import { StreakBrokenOverlay } from '@/components/StreakBrokenOverlay';
import { StreakCelebration } from '@/components/StreakCelebration';
import { StreakProtectionBanner } from '@/components/StreakProtectionBanner';
import { WeeklyRecapModal } from '@/components/WeeklyRecapModal';
import { XPPopUp } from '@/components/XPPopUp';
import { BorderRadius, Spacing, Typography } from '@/constants/theme';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useStore } from '@/store/useStore';
import { getTodayLocal } from '@/utils/dateUtils';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { AppState, Dimensions, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { FadeIn, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

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
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View>
            <SkeletonBlock width={100} height={12} borderRadius={6} />
            <View style={{ marginTop: 8 }}>
              <SkeletonBlock width={150} height={28} borderRadius={10} />
            </View>
          </View>
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
            <SkeletonBlock width={140} height={44} borderRadius={20} />
          </View>
        </View>
      </View>
      {/* Card skeletons */}
      {[220, 180, 260, 160].map((h, i) => (
        <View key={i} style={[skeletonStyles.card, { backgroundColor: colors.isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)', borderColor: colors.border }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <SkeletonBlock width={32} height={32} borderRadius={16} />
            <SkeletonBlock width="40%" height={14} borderRadius={6} />
          </View>
          <SkeletonBlock width="100%" height={h - 60} borderRadius={20} />
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


function PulseButton({ children, style, onPress, accessibilityLabel }: { children: React.ReactNode; style: any; onPress: () => void; accessibilityLabel: string }) {
  const scale = useSharedValue(1);

  useEffect(() => {
    scale.value = withRepeat(
      withSequence(
        withTiming(1.05, { duration: 800 }),
        withTiming(1, { duration: 800 })
      ),
      -1,
      true
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={[style, animatedStyle]}>
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={onPress}
        accessibilityLabel={accessibilityLabel}
        accessibilityRole="button"
        style={{ width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' }}
      >
        {children}
      </TouchableOpacity>
    </Animated.View>
  );
}

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
  const isPro = useStore(s => s.isPro);
  const { progress: xpProgress, xpInLevel, xpRequiredForNext } = getLevelProgress(totalXP);
  // UI-001/007: Detect new user so we can show CTAs instead of empty/0% widgets.
  const tasks = useStore(s => s.tasks);
  const habits = useStore(s => s.habits);
  const taskCount = tasks.length;
  const isLimitReached = !isPro && habits.length >= 5;
  const { tasksLoaded, habitsLoaded } = useStore(s => s.syncStatus);
  const streakFreezes = useStore(s => s.streakFreezes);
  const globalStreak = useStore(s => s.globalStreak);
  const dailyQuests = useStore(s => s.dailyQuests);
  const hasSeenDailyHighlight = useStore(s => s.hasSeenDailyHighlight);

  // PHASE 2 FIX: Only show the "Welcome" banner if sync is finished AND no data was found.
  // This prevents returning users from seeing the banner while their cloud data is loading.
  const isNewUser = (tasksLoaded && habitsLoaded) && taskCount === 0 && habits.length === 0;

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
          <StreakProtectionBanner />
          <EmailVerificationBanner />

          {/* Freeze Promo Card */}
          {globalStreak >= 5 && streakFreezes === 0 && (
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => router.push('/progress')}
              style={[styles.freezePromo, { backgroundColor: colors.isDark ? 'rgba(0,180,255,0.1)' : 'rgba(0,180,255,0.05)', borderColor: '#00B4FF40' }]}
            >
              <View style={[styles.freezeIcon, { backgroundColor: '#00B4FF' }]}>
                <Ionicons name="snow" size={18} color="#FFF" />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={[styles.freezeTitle, { color: colors.text }]}>Insure your progress! ❄️</Text>
                <Text style={[styles.freezeSub, { color: colors.textSecondary }]}>Get a Streak Freeze to protect your {globalStreak}-day streak.</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          )}

          <View style={styles.topSection}>
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

                <View style={styles.headerRight}>
                  {streakFreezes > 0 && (
                    <View style={[styles.freezeBadge, { backgroundColor: colors.isDark ? 'rgba(0,180,255,0.15)' : 'rgba(0,180,255,0.1)', borderColor: '#00B4FF40' }]}>
                      <Ionicons name="snow" size={14} color="#00B4FF" />
                      <Text style={[styles.freezeCount, { color: '#00B4FF' }]}>{streakFreezes}</Text>
                    </View>
                  )}

                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => router.push('/(tabs)/profile')}
                    style={[styles.xpHeaderContainer, { backgroundColor: colors.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)', borderColor: colors.border }]}
                    accessibilityLabel={`Level ${level}, ${Math.round(xpProgress * 100)}% to next level. Tap to view profile.`}
                    accessibilityRole="button"
                  >
                    <View style={styles.xpInfo}>
                      <View style={styles.levelBadge}>
                        <Text style={[styles.levelLabel, { color: '#FFF' }]}>{level}</Text>
                      </View>
                      <View style={styles.xpBarWrapper}>
                        <View style={styles.xpTextRow}>
                          <Text style={[styles.xpValueText, { color: colors.text }]}>
                            {Math.round(xpInLevel)} <Text style={{ color: colors.textSecondary, fontSize: 8 }}>/ {xpRequiredForNext} XP</Text>
                          </Text>
                        </View>
                        <View style={styles.xpBarContainer}>
                          <View style={[styles.xpBarBg, { backgroundColor: colors.isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }]}>
                            <View style={[styles.xpBarFill, { width: `${xpProgress * 100}%`, backgroundColor: colors.primary }]} />
                          </View>
                        </View>
                      </View>
                    </View>
                  </TouchableOpacity>
                </View>
              </View>

              <Text style={[styles.userName, { color: colors.text }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>
                {userName ? `${userName}!` : 'there!'}
              </Text>
            </View>
          </View>

          {/* Dashboard Widgets */}
          {isNewUser && (
            <Animated.View
              entering={FadeIn.delay(600)}
              style={[styles.newUserBanner, { borderColor: colors.primary + '40' }]}
            >
              <LinearGradient
                colors={[colors.primary, colors.secondary || colors.primary]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.bannerGradient}
              />
              <View style={styles.bannerContent}>
                <View style={styles.bannerIconContainer}>
                  <Ionicons name="rocket" size={24} color="#FFF" />
                </View>
                <View style={styles.bannerTextContainer}>
                  <Text style={[styles.newUserTitle, { color: '#FFF' }]}>Your Journey Starts Here</Text>
                  <Text style={[styles.newUserSub, { color: 'rgba(255,255,255,0.85)' }]}>
                    Complete your first quest by setting up a habit or task.
                  </Text>
                </View>
              </View>

              <View style={styles.newUserActions}>
                <PulseButton
                  style={[styles.newUserBtn, { backgroundColor: '#FFF' }]}
                  onPress={() => router.push('/all-habits' as any)}
                  accessibilityLabel="Add your first habit"
                >
                  <Text style={[styles.newUserBtnText, { color: colors.primary }]}>+ Add Habit</Text>
                </PulseButton>
                <TouchableOpacity
                  style={[styles.newUserBtn, { backgroundColor: 'rgba(255,255,255,0.2)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' }]}
                  onPress={() => router.push('/all-tasks' as any)}
                  accessibilityLabel="Add your first task"
                  accessibilityRole="button"
                >
                  <Text style={[styles.newUserBtnText, { color: '#FFF' }]}>+ Add Task</Text>
                </TouchableOpacity>
              </View>
            </Animated.View>
          )}
          <SmartAIFAB />
          <View style={{ marginBottom: Spacing.lg }}>
            {tasks.filter(t => t.date === getTodayLocal()).length === 0 ? (
              <TouchableOpacity
                style={[styles.emptyCard, { backgroundColor: colors.isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)', borderColor: colors.border }]}
                onPress={() => router.push('/tasks/create' as any)}
              >
                <View style={styles.emptyIconCircle}>
                  <Ionicons name="create" size={24} color={colors.primary} />
                </View>
                <Text style={[styles.emptyTitle, { color: colors.text }]}>Plan Your Day</Text>
                <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>No tasks for today. Start fresh!</Text>
              </TouchableOpacity>
            ) : (
              <QuestDashboard />
            )}
          </View>

          <View style={{ marginBottom: Spacing.lg }}>
            <FocusWidget />
          </View>

          <View style={{ marginBottom: Spacing.lg }}>
            <DailyTasksWidget />
          </View>

          <View style={{ marginBottom: Spacing.lg }}>
            {habits.length === 0 ? (
              <TouchableOpacity
                style={[styles.emptyCard, { backgroundColor: colors.isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)', borderColor: colors.border }]}
                onPress={() => router.push('/all-habits' as any)}
              >
                <View style={styles.emptyIconCircle}>
                  <Ionicons name="sparkles" size={24} color={colors.primary} />
                </View>
                <Text style={[styles.emptyTitle, { color: colors.text }]}>Build a Habit</Text>
                <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>Add your first habit to track streaks.</Text>
              </TouchableOpacity>
            ) : (
              <HabitGrid />
            )}
          </View>
          <View style={{ marginBottom: Spacing.lg }}>
            <MoodTrend />
          </View>
          {/* AI entry point consolidated into SmartAIFAB above */}

          {/* Footer Spacer */}
          <View style={{ height: 40 }} />
        </Animated.ScrollView>

        {/* Rewards Layer (Persistent) */}
        <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
          <OnboardingWalkthrough />
          <StreakCelebration />
          <XPPopUp />
          <DailyHighlightModal
            isVisible={
              dailyQuests.length > 0 &&
              dailyQuests.every(q => q.completed) &&
              hasSeenDailyHighlight !== getTodayLocal()
            }
            onClose={useStore.getState().actions.dismissDailyHighlight}
          />
          <MoodFeedbackOverlay />
          <StreakBrokenOverlay />
          <WeeklyRecapModal />
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
    paddingBottom: 140, // FIX UI-001: Increase to avoid overlap with floating tab bar
  },
  glowBackground: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    opacity: 0.35,
  },
  topSection: {
    marginBottom: Spacing.sm,
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
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  userName: {
    ...Typography.h1Hero,
    fontSize: 34,
    lineHeight: 42,
  },
  newUserBanner: {
    borderRadius: 24,
    borderWidth: 1,
    padding: Spacing.lg,
    marginBottom: Spacing.xl,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 15,
  },
  bannerGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  bannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.lg,
    gap: 16,
  },
  bannerIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerTextContainer: {
    flex: 1,
  },
  newUserTitle: {
    fontFamily: 'Outfit-Bold',
    fontSize: 20,
    marginBottom: 4,
  },
  newUserSub: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: 'Outfit-Medium',
  },
  newUserActions: {
    flexDirection: 'row',
    gap: 12,
  },
  newUserBtn: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  newUserBtnText: {
    fontFamily: 'Outfit-Bold',
    fontSize: 15,
  },
  aiSection: {
    alignItems: 'center',
    marginTop: Spacing.md,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  freezeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 12,
    borderWidth: 1,
    gap: 4,
  },
  freezeCount: {
    fontSize: 12,
    fontFamily: 'Outfit-Bold',
  },
  xpHeaderContainer: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    minWidth: 140,
    maxWidth: width * 0.45, // FIX UI-004: Prevent overflow on small devices
  },
  xpInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  levelBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#7C5CFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#7C5CFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  levelLabel: {
    fontSize: 12,
    fontFamily: 'Outfit-Bold',
  },
  xpBarWrapper: {
    flex: 1,
    gap: 4,
  },
  xpTextRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'baseline',
  },
  xpValueText: {
    fontSize: 10,
    fontFamily: 'Outfit-Bold',
    letterSpacing: 0.2,
  },
  xpBarContainer: {
    width: '100%',
  },
  xpBarBg: {
    height: 6,
    width: '100%',
    borderRadius: 3,
    overflow: 'hidden',
  },
  xpBarFill: {
    height: '100%',
    borderRadius: 3,
  },

  emptyCard: {
    padding: Spacing.xl,
    borderRadius: 24,
    borderWidth: 1,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(124, 92, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  emptyTitle: {
    fontSize: 16,
    fontFamily: 'Outfit-Bold',
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 13,
    fontFamily: 'Outfit-Regular',
    textAlign: 'center',
  },
  freezePromo: {
    marginHorizontal: Spacing.md,
    marginVertical: Spacing.md,
    padding: Spacing.md,
    borderRadius: 20,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  freezeIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  freezeTitle: {
    fontSize: 15,
    fontFamily: 'Outfit-Bold',
  },
  freezeSub: {
    fontSize: 11,
    fontFamily: 'Outfit-Medium',
    marginTop: 2,
  },
});
