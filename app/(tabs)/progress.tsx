import { BlurView } from '@/components/BlurView';
import { CircularProgress } from '@/components/CircularProgress';
import { FocusPulseChart } from '@/components/FocusPulseChart';
import { HabitCalendar } from '@/components/HabitCalendar';
import { ShareWeeklyCard } from '@/components/ShareWeeklyCard';
import { SkeletonBlock } from '@/components/ui/Skeleton';
import { BorderRadius, Spacing, Typography } from '@/constants/theme';
import { useProGate } from '@/hooks/useProFeature';
import { useProfileStats } from '@/hooks/useProfileStats';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useStore } from '@/store/useStore';
import { formatLocalDate, getTodayLocal } from '@/utils/dateUtils';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Award, Brain, Flame, Info, Lock, PlusCircle, ShieldAlert, Sparkles, Target, TrendingUp, Zap } from 'lucide-react-native';
import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Dimensions, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

// BUG-NET-2 FIX: Skeleton for Progress screen — shown when habits/mood/focus data
// hasn't arrived from Firestore yet. Prevents "0%" and "0h" looking like real data.
function ProgressSkeleton() {
  const colors = useThemeColors();
  return (
    <Animated.View entering={FadeIn.duration(300)} style={[styles.container, { backgroundColor: colors.background }]}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={[styles.header, { marginBottom: Spacing.lg }]}>
            <View style={{ gap: 6 }}>
              <SkeletonBlock width={80} height={10} borderRadius={4} />
              <SkeletonBlock width={140} height={32} borderRadius={8} />
            </View>
            <SkeletonBlock width={72} height={32} borderRadius={16} />
          </View>

          {/* Hero life score card */}
          <View style={[styles.premiumCard, { backgroundColor: colors.card, borderColor: colors.border, marginBottom: Spacing.sm }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View style={{ gap: 10, flex: 1 }}>
                <SkeletonBlock width={100} height={10} borderRadius={4} />
                <SkeletonBlock width={80} height={48} borderRadius={10} />
                <SkeletonBlock width={120} height={12} borderRadius={4} />
              </View>
              <SkeletonBlock width={100} height={100} borderRadius={50} />
            </View>
          </View>

          {/* 3 metric mini-cards */}
          <View style={{ flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.lg }}>
            {[...Array(3)].map((_, i) => (
              <View key={i} style={[styles.premiumCard, { flex: 1, backgroundColor: colors.card, borderColor: colors.border, alignItems: 'center', paddingVertical: Spacing.md }]}>
                <SkeletonBlock width={36} height={36} borderRadius={12} style={{ marginBottom: 6 }} />
                <SkeletonBlock width={32} height={20} borderRadius={6} style={{ marginBottom: 4 }} />
                <SkeletonBlock width={40} height={10} borderRadius={4} />
              </View>
            ))}
          </View>

          {/* XP bar card */}
          <View style={[styles.premiumCard, { backgroundColor: colors.card, borderColor: colors.border, marginBottom: Spacing.lg }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
              <SkeletonBlock width={120} height={16} borderRadius={6} />
              <SkeletonBlock width={80} height={12} borderRadius={4} />
            </View>
            <SkeletonBlock width="100%" height={10} borderRadius={5} style={{ marginBottom: 6 }} />
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 12 }}>
              {[...Array(4)].map((_, i) => (
                <SkeletonBlock key={i} width={80} height={12} borderRadius={4} />
              ))}
            </View>
          </View>

          {/* 2 chart placeholder cards */}
          {[...Array(2)].map((_, i) => (
            <View key={i} style={[styles.premiumCard, { backgroundColor: colors.card, borderColor: colors.border, marginBottom: Spacing.lg }]}>
              <SkeletonBlock width={140} height={18} borderRadius={6} style={{ marginBottom: 16 }} />
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', height: 100 }}>
                {[...Array(7)].map((_, j) => (
                  <SkeletonBlock key={j} width={12} height={Math.random() * 60 + 20} borderRadius={6} />
                ))}
              </View>
            </View>
          ))}

          <View style={{ height: 100 }} />
        </ScrollView>
      </SafeAreaView>
    </Animated.View>
  );
}

// Local Premium Card Component
const PremiumCard = ({ children, style }: { children: React.ReactNode, style?: any }) => {
  const colors = useThemeColors();
  return (
    <View style={[
      styles.premiumCard,
      { backgroundColor: colors.card, borderColor: colors.border },
      style
    ]}>
      {children}
    </View>
  );
};

const ProFeatureLock = ({ title, subtitle }: { title: string, subtitle: string }) => {
  const colors = useThemeColors();
  const { openPaywall } = useProGate();

  return (
    <BlurView intensity={Platform.OS === 'ios' ? 20 : 100} tint={colors.isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill}>
      <View style={styles.lockOverlay}>
        <View style={[styles.lockCircle, { backgroundColor: colors.primary + '20' }]}>
          <Lock size={20} color={colors.primary} />
        </View>
        <Text style={[styles.lockTitle, { color: colors.text, fontSize: 16 }]}>{title}</Text>
        <Text style={[styles.lockSub, { color: colors.textSecondary, fontSize: 12, marginBottom: 16 }]}>{subtitle}</Text>
        <TouchableOpacity
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
            openPaywall();
          }}
          style={[styles.unlockBtn, { backgroundColor: colors.primary, paddingVertical: 8, paddingHorizontal: 20 }]}
        >
          <Text style={[styles.unlockBtnText, { fontSize: 13 }]}>Unlock Now</Text>
        </TouchableOpacity>
      </View>
    </BlurView>
  );
};

export default function ProgressScreen() {
  // Selectors: each field re-renders this screen only when it changes.
  // focusSession is selected whole here since the progress screen genuinely
  // displays live focus data (totalSecondsToday).
  const tasks = useStore(s => s.tasks);
  const habits = useStore(s => s.habits);
  const focusHistory = useStore(s => s.focusHistory);
  const focusSession = useStore(s => s.focusSession);
  const focusGoalHours = useStore(s => s.focusGoalHours);
  const moodHistory = useStore(s => s.moodHistory);
  const streakFreezes = useStore(s => s.streakFreezes);
  const buyStreakFreeze = useStore(s => s.actions.buyStreakFreeze);
  const lifeScoreHistory = useStore(s => s.lifeScoreHistory);
  const avatarUrl = useStore(s => s.avatarUrl);
  const userName = useStore(s => s.userName);
  const updateLifeScoreHistory = useStore(s => s.actions.updateLifeScoreHistory);
  // BUG-NET-2 FIX: Wait for all three data sources before rendering real numbers.
  // Without this, users see "0%" "0h" "0 tasks" immediately on open — it looks broken.
  const habitsLoaded = useStore(s => s.syncStatus.habitsLoaded);
  const moodLoaded = useStore(s => s.syncStatus.moodLoaded);
  const focusLoaded = useStore(s => s.syncStatus.focusLoaded);
  const tasksLoaded = useStore(s => s.syncStatus.tasksLoaded);
  const colors = useThemeColors();
  const router = useRouter();
  const { isPro, openPaywall } = useProGate();

  // Show skeleton while any core data source is still resolving
  const isDataReady = habitsLoaded && moodLoaded && focusLoaded && tasksLoaded;

  useEffect(() => {
    updateLifeScoreHistory();
  }, [tasks, habits, focusSession.totalSecondsToday]);
  const [selectedHabitIndex, setSelectedHabitIndex] = useState(0);

  // P-7 FIX: Bounds check for chosen habit index (prevents crash on deletion)
  useEffect(() => {
    if (habits.length > 0 && selectedHabitIndex >= habits.length) {
      setSelectedHabitIndex(Math.max(0, habits.length - 1));
    }
  }, [habits.length]);

  // 1. Calculate Today's Stats
  const todayStr = getTodayLocal();

  const todayTasks = tasks.filter(t => t.date === todayStr);
  const completedTasksCount = todayTasks.filter(t => t.completed).length;
  const totalTasksCount = todayTasks.length;

  const completedHabitsCount = habits.filter(h => h.completedDays.includes(todayStr)).length;
  const totalHabitsCount = habits.length;

  const focusSecondsToday = focusSession?.totalSecondsToday || 0;
  const focusGoalSeconds = (focusGoalHours || 8) * 3600;
  const focusCompletionPerc = Math.min((focusSecondsToday / focusGoalSeconds) * 100, 100);

  // Overall Score Breakdown
  // Only include a metric if the user has data for it — having zero tasks should not
  // drag the score down; it simply means tasks aren't part of today's picture.
  const taskCompletionPerc = totalTasksCount > 0 ? (completedTasksCount / totalTasksCount) * 100 : null;
  const habitCompletionPerc = totalHabitsCount > 0 ? (completedHabitsCount / totalHabitsCount) * 100 : null;

  const activeMetrics = [taskCompletionPerc, habitCompletionPerc, focusCompletionPerc].filter(v => v !== null) as number[];
  const lifeScore = activeMetrics.length > 0
    ? Math.round(activeMetrics.reduce((a, b) => a + b, 0) / activeMetrics.length)
    : 0;

  const {
    level: userLevel,
    xpInCurrentLevel,
    xpProgress,
    xpNeeded,
    globalStreak
  } = useProfileStats();

  // Formatting Data...
  const focusChartData = useMemo(() => {
    const data = [];
    const DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

    // Find the most recent Sunday
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day;
    const sunday = new Date(today);
    sunday.setDate(diff);

    for (let i = 0; i < 7; i++) {
      const d = new Date(sunday);
      d.setDate(sunday.getDate() + i);
      const dStr = formatLocalDate(d);
      let seconds = focusHistory?.[dStr] || 0;
      if (dStr === formatLocalDate(new Date())) seconds = focusSecondsToday;
      data.push({ day: DAYS[i], hours: parseFloat((seconds / 3600).toFixed(1)), date: dStr });
    }
    return data;
  }, [focusHistory, focusSecondsToday]);

  const moodChartData = useMemo(() => {
    const data = [];
    const DAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

    // Find the most recent Monday
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(today);
    monday.setDate(diff);

    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const dStr = formatLocalDate(d);
      const entry = moodHistory[dStr];
      data.push({ day: DAYS[i], mood: entry ? entry.mood : 0, date: dStr });
    }
    return data;
  }, [moodHistory]);

  const avgMood = useMemo(() => {
    const moods = moodChartData.filter(m => m.mood > 0);
    return moods.length === 0 ? "0" : (moods.reduce((acc, item) => acc + item.mood, 0) / moods.length).toFixed(1);
  }, [moodChartData]);

  const lifeScoreChartData = useMemo(() => {
    const data = [];
    const DAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

    // Find the most recent Monday
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(today);
    monday.setDate(diff);

    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const dStr = formatLocalDate(d);
      const score = dStr === todayStr ? lifeScore : (lifeScoreHistory[dStr] || 0);
      data.push({ day: DAYS[i], score, date: dStr });
    }
    return data;
  }, [lifeScoreHistory, lifeScore, todayStr]);

  const momentum = useMemo(() => {
    const pastScores = lifeScoreChartData.filter(d => d.date < todayStr && d.score > 0);
    if (pastScores.length === 0) return 0;
    const avgPast = pastScores.reduce((acc, d) => acc + d.score, 0) / pastScores.length;
    return Math.round(lifeScore - avgPast);
  }, [lifeScoreChartData, lifeScore, todayStr]);

  // BUG-NET-2 FIX: Return skeleton while data resolves from Firestore
  if (!isDataReady) return <ProgressSkeleton />;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

          {/* Redesigned Header */}
          <View style={[styles.header, { marginTop: Spacing.md }]}>
            <View style={styles.headerLeft}>
              <Text style={[styles.headerTitle, { color: colors.text }]}>Progress Report</Text>
            </View>

            <View style={styles.headerRight}>
              <View style={styles.badgeContainer}>
                {globalStreak > 0 && (
                  <View style={[styles.statusBadge, { backgroundColor: colors.danger + '10', borderColor: colors.danger + '20' }]}>
                    <Flame size={14} color={colors.danger} fill={colors.danger} />
                    <Text style={[styles.statusBadgeText, { color: colors.danger }]}>{globalStreak}</Text>
                  </View>
                )}
                <TouchableOpacity
                  onPress={() => router.push('/(tabs)/profile')}
                  style={[styles.statusBadge, { backgroundColor: colors.primary + '10', borderColor: colors.primary + '20' }]}
                >
                  <Award size={14} color={colors.primary} />
                  <Text style={[styles.statusBadgeText, { color: colors.primary }]}>LVL {userLevel}</Text>
                </TouchableOpacity>
              </View>


            </View>
          </View>

          {/* ZONE 1: DAILY PULSE */}
          <View style={styles.sectionZone}>
            <PremiumCard style={styles.heroCard}>
              <View style={styles.heroMain}>
                <View style={styles.scoreInfo}>
                  <View style={styles.labelRow}>
                    <Text style={[styles.momentumLabel, { color: colors.primary, fontFamily: 'Outfit-Bold', textTransform: 'uppercase', letterSpacing: 1.2 }]}>LIFE MOMENTUM</Text>
                    <TouchableOpacity onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}>
                      <Info size={12} color={colors.textSecondary} />
                    </TouchableOpacity>
                  </View>
                  <Text style={[styles.momentumValue, { color: colors.text }]}>{lifeScore}%</Text>

                  <View style={styles.momentumStats}>
                    <Ionicons
                      name={momentum >= 0 ? 'trending-up' : 'trending-down'}
                      size={14}
                      color={momentum >= 0 ? colors.success : colors.danger}
                    />
                    <Text style={[
                      styles.momentumText,
                      { color: momentum >= 0 ? colors.success : colors.danger }
                    ]}>
                      {momentum >= 0 ? `+${momentum}%` : `${momentum}%`} from avg
                    </Text>
                  </View>

                  {/* Breakdown Icons */}
                  <View style={styles.breakdownRow}>
                    <BreakdownIcon icon={<Target size={10} color={colors.secondary} />} label={`${Math.round(taskCompletionPerc || 0)}%`} />
                    <BreakdownIcon icon={<Zap size={10} color={colors.danger} />} label={`${Math.round(habitCompletionPerc || 0)}%`} />
                    <BreakdownIcon icon={<Brain size={10} color={colors.success} />} label={`${Math.round(focusCompletionPerc)}%`} />
                  </View>
                </View>
                <View style={styles.scoreVisual}>
                  <CircularProgress size={100} strokeWidth={10} progress={lifeScore}>
                    <TrendingUp size={28} color={colors.primary} />
                  </CircularProgress>
                </View>
              </View>
            </PremiumCard>
            <View style={styles.metricsGrid}>
              <MetricItem icon={<Brain size={18} color={colors.success} />} value={`${(focusSecondsToday / 3600).toFixed(1)}h`} label="Focus" color={colors.success} />
              <MetricItem icon={<Target size={18} color={colors.secondary} />} value={`${completedTasksCount}`} label="Tasks" color={colors.secondary} />
              <MetricItem icon={<Zap size={18} color={colors.danger} />} value={`${completedHabitsCount}`} label="Habits" color={colors.danger} />
            </View>
            <ShareWeeklyCard />


            <TouchableOpacity
              onPress={() => isPro ? router.push('/social-leaderboard') : openPaywall()}
              style={[
                styles.leagueBanner,
                {
                  backgroundColor: colors.isDark ? (isPro ? '#2A1F45' : '#1F2937') : (isPro ? '#F7F4FE' : '#F1F5F9'),
                  borderColor: isPro ? colors.primary + '30' : colors.border
                }
              ]}
            >
              <View style={styles.leagueBannerContent}>
                <View style={[styles.leagueIconWrapper, !isPro && { backgroundColor: colors.isDark ? '#374151' : '#E2E8F0' }]}>
                  {isPro ? (
                    <Flame size={20} color={colors.primary} />
                  ) : (
                    <Lock size={18} color={colors.textSecondary} />
                  )}
                </View>
                <View style={styles.leagueTextWrapper}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={[styles.leagueTitle, { color: isPro ? colors.text : colors.textSecondary }]}>The Weekly League</Text>
                    {!isPro && (
                      <View style={styles.miniProBadge}>
                        <Text style={styles.miniProBadgeText}>PRO</Text>
                      </View>
                    )}
                  </View>
                  <Text style={[styles.leagueSub, { color: colors.textSecondary, opacity: isPro ? 1 : 0.6 }]}>
                    {isPro ? 'Rank up against your friends!' : 'Join the global competition'}
                  </Text>
                </View>
              </View>
              <View style={[styles.leagueAction, !isPro && { backgroundColor: 'rgba(0,0,0,0.05)' }]}>
                <Text style={[styles.leagueActionText, { color: isPro ? colors.primary : colors.textSecondary }]}>
                  {isPro ? 'View' : 'Unlock'}
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                if (!isPro) {
                  openPaywall();
                  return;
                }
                Alert.alert(
                  'Confirm Purchase',
                  'Buy Streak Freeze for 1,000 XP?',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Buy', onPress: buyStreakFreeze }
                  ]
                );
              }}
              style={[
                styles.leagueBanner,
                {
                  backgroundColor: colors.isDark ? '#1F2937' : '#F1F5F9',
                  borderColor: colors.border,
                  marginTop: Spacing.sm,
                  opacity: isPro ? 1 : 0.8
                }
              ]}
            >
              <View style={styles.leagueBannerContent}>
                <View style={[styles.leagueIconWrapper, { backgroundColor: colors.isDark ? '#374151' : '#E2E8F0' }]}>
                  {isPro ? (
                    <ShieldAlert size={20} color="#38BDF8" />
                  ) : (
                    <Lock size={18} color={colors.textSecondary} />
                  )}
                </View>
                <View style={styles.leagueTextWrapper}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={[styles.leagueTitle, { color: isPro ? colors.text : colors.textSecondary }]}>
                      Buy Streak Freeze
                    </Text>
                    {!isPro && (
                      <View style={styles.miniProBadge}>
                        <Text style={styles.miniProBadgeText}>PRO</Text>
                      </View>
                    )}
                  </View>
                  <Text style={[styles.leagueSub, { color: colors.textSecondary, opacity: isPro ? 1 : 0.6 }]}>
                    {isPro
                      ? (streakFreezes >= 3 ? 'Max Freezes Reached (3/3)' : `You have ${streakFreezes}/3 Freezes`)
                      : 'Never lose your streak again'
                    }
                  </Text>
                </View>
              </View>
              {isPro ? (
                <View style={{
                  backgroundColor: 'rgba(56, 189, 248, 0.1)',
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  justifyContent: 'center',
                  alignItems: 'center'
                }}>
                  <PlusCircle size={20} color={streakFreezes >= 3 ? colors.textSecondary : "#38BDF8"} />
                </View>
              ) : (
                <View style={[styles.leagueAction, { backgroundColor: 'rgba(0,0,0,0.05)' }]}>
                  <Text style={[styles.leagueActionText, { color: colors.textSecondary }]}>Unlock</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* ZONE 2: GROWTH & EVOLUTION */}
          <View style={styles.sectionZone}>
            <Text style={[styles.sectionTitle, { color: colors.text, marginVertical: Spacing.lg }]}>Growth & Evolution</Text>

            <PremiumCard style={styles.xpCard}>
              <View style={styles.xpHeader}>
                <View style={styles.xpTitleRow}>
                  <Sparkles size={16} color={colors.primary} />
                  <Text style={[styles.xpTitle, { color: colors.text }]}>Experience (XP)</Text>
                </View>
                <Text style={[styles.xpSub, { color: colors.textSecondary }]}>{xpNeeded} XP to Level {userLevel + 1}</Text>
              </View>

              <View style={[styles.xpProgressBarBg, { backgroundColor: colors.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]}>
                <LinearGradient colors={[colors.primary, colors.secondary]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[styles.xpProgressBarFill, { width: `${xpProgress * 100}%` }]} />
              </View>

              <View style={styles.masteryGuideContainer}>
                <Text style={[styles.guideHeader, { color: colors.textSecondary }]}>MASTERY GUIDE</Text>

                <View style={styles.guideTable}>
                  <View style={styles.guideRow}>
                    <View style={styles.guideInfo}>
                      <Target size={14} color={colors.secondary} />
                      <Text style={[styles.guideActivity, { color: colors.text }]}>Task Completion</Text>
                    </View>
                    <View style={[styles.xpPill, { backgroundColor: colors.secondary + '15' }]}>
                      <Text style={[styles.xpPillText, { color: colors.secondary }]}>+15 XP</Text>
                    </View>
                  </View>

                  <View style={styles.guideRow}>
                    <View style={styles.guideInfo}>
                      <Zap size={14} color={colors.danger} />
                      <Text style={[styles.guideActivity, { color: colors.text }]}>Habit Check-in</Text>
                    </View>
                    <View style={[styles.xpPill, { backgroundColor: colors.danger + '15' }]}>
                      <Text style={[styles.xpPillText, { color: colors.danger }]}>+10 XP</Text>
                    </View>
                  </View>

                  <View style={styles.guideRow}>
                    <View style={styles.guideInfo}>
                      <Brain size={14} color={colors.success} />
                      <Text style={[styles.guideActivity, { color: colors.text }]}>Focus Hour</Text>
                    </View>
                    <View style={[styles.xpPill, { backgroundColor: colors.success + '15' }]}>
                      <Text style={[styles.xpPillText, { color: colors.success }]}>+20 XP</Text>
                    </View>
                  </View>

                  <View style={styles.guideRow}>
                    <View style={styles.guideInfo}>
                      <Award size={14} color={colors.primary} />
                      <Text style={[styles.guideActivity, { color: colors.text }]}>Daily Quest</Text>
                    </View>
                    <View style={[styles.xpPill, { backgroundColor: colors.primary + '15' }]}>
                      <Text style={[styles.xpPillText, { color: colors.primary }]}>+30-100 XP</Text>
                    </View>
                  </View>
                </View>
              </View>
            </PremiumCard>

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Mindset Synergy</Text>
                <View style={[styles.pill, { backgroundColor: colors.success + '10' }]}><Text style={[styles.pillText, { color: colors.success }]}>Avg: {avgMood}</Text></View>
              </View>
              <PremiumCard style={[styles.moodCard, !isPro && { overflow: 'hidden' }]}>
                <View style={styles.moodChartContainer}>
                  {moodChartData.map((item, i) => {
                    const m = item.mood;
                    const hasData = m > 0;
                    const h = hasData ? m * 25 : 4;
                    const isToday = item.date === getTodayLocal();

                    return (
                      <View key={i} style={styles.moodBarContainer}>
                        <View style={[styles.moodBarBg, { backgroundColor: colors.isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)' }]}>
                          <LinearGradient
                            colors={hasData ? (m > 3 ? [colors.success, colors.success + '40'] : [colors.primary, colors.primary + '40']) : ['transparent', 'transparent']}
                            style={[styles.moodBarFill, { height: h }]}
                          />
                        </View>
                        <Text style={[styles.moodBarLabel, { color: isToday ? colors.primary : colors.textSecondary, fontWeight: isToday ? '800' : '700' }]}>{item.day}</Text>
                      </View>
                    );
                  })}
                </View>
                <Text style={[styles.moodInsight, { color: colors.textSecondary }]}>{parseFloat(avgMood) >= 4 ? "Your mood is powering your momentum! 🚀" : "Consistency is key. Keep pushing forward! ✨"}</Text>
                {!isPro && <ProFeatureLock title="Mindset Synergy" subtitle="Unlock deep mood trends and AI insights" />}
              </PremiumCard>
            </View>

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Life Evolution</Text>
                <Text style={[styles.sectionSub, { color: colors.textSecondary }]}>Weekly Score</Text>
              </View>
              <PremiumCard style={[styles.lifeHistoryCard, !isPro && { overflow: 'hidden' }]}>
                <View style={[styles.chartInner, { height: 180 }]}>
                  {lifeScoreChartData.map((item, i) => {
                    const h = item.score > 0 ? (item.score / 100) * 110 : 4;
                    const isToday = item.date === todayStr;
                    return (
                      <View key={i} style={styles.barContainer}>
                        <View style={[styles.barBg, { backgroundColor: colors.isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)' }]}>
                          <LinearGradient
                            colors={item.score > 0 ? [colors.primary, colors.secondary] : ['transparent', 'transparent']}
                            style={[styles.barFill, { height: h }]}
                          />
                        </View>
                        <Text style={[styles.barLabel, {
                          color: isToday ? colors.primary : colors.textSecondary,
                          fontWeight: isToday ? '800' : '600'
                        }]}>
                          {item.day}
                        </Text>
                      </View>
                    );
                  })}
                </View>
                {!isPro && <ProFeatureLock title="Life Evolution" subtitle="Track your weekly progress and momentum" />}
              </PremiumCard>
            </View>

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Focus Intensity</Text>
                <Text style={[styles.sectionSub, { color: colors.textSecondary }]}>Last 7 Days</Text>
              </View>
              <PremiumCard style={[styles.chartCard, !isPro && { overflow: 'hidden' }]}>
                <FocusPulseChart data={focusChartData} goal={focusGoalHours || 8} />
                {!isPro && <ProFeatureLock title="Focus Intensity" subtitle="Analyze your deep work patterns" />}
              </PremiumCard>
            </View>
          </View>

          {/* ZONE 3: MASTERY */}
          <View style={styles.sectionZone}>
            <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: Spacing.md }]}>Habit Consistency</Text>
            <PremiumCard style={[styles.heatmapCard, !isPro && { overflow: 'hidden' }]}>
              {habits.length > 0 ? (() => {
                const safeIndex = selectedHabitIndex < habits.length ? selectedHabitIndex : Math.max(0, habits.length - 1);
                const habit = habits[safeIndex];
                if (!habit) return null;
                return (
                  <View>
                    {habits.length > 1 && (
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.habitSelector} contentContainerStyle={styles.habitSelectorContent}>
                        {habits.map((h, i) => (
                          <TouchableOpacity key={h.id} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setSelectedHabitIndex(i); }} style={[styles.habitChip, { backgroundColor: colors.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)', borderColor: colors.border }, selectedHabitIndex === i && { backgroundColor: colors.primary + '15', borderColor: colors.primary }]}>
                            <Text style={[styles.habitChipText, { color: selectedHabitIndex === i ? colors.primary : colors.textSecondary }]}>{h.icon} {h.title}</Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    )}
                    <Text style={[styles.selectedHabitTitle, { color: colors.text }]}>{habit.title}</Text>
                    <HabitCalendar {...habit} />
                  </View>
                );
              })() : (
                <View style={styles.emptyState}><Ionicons name="calendar-outline" size={32} color={colors.textSecondary} /><Text style={[styles.emptyText, { color: colors.textSecondary }]}>Start a habit to track your consistency.</Text></View>
              )}
              {!isPro && <ProFeatureLock title="Mastery Consistency" subtitle="Unlock long-term habit tracking and insights" />}
            </PremiumCard>
          </View>

          <View style={{ height: 100 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function BreakdownIcon({ icon, label }: { icon: any, label: string }) {
  const colors = useThemeColors();
  return (
    <View style={styles.breakdownItem}>
      {icon}
      <Text style={[styles.breakdownLabel, { color: colors.textSecondary }]}>{label}</Text>
    </View>
  );
}

function MetricItem({ icon, value, label, color }: { icon: any, value: string, label: string, color: string }) {
  const colors = useThemeColors();
  return (
    <PremiumCard style={styles.metricItem}>
      <View style={[styles.metricIcon, { backgroundColor: color + '10' }]}>{icon}</View>
      <Text style={[styles.metricValue, { color: colors.text }]}>{value}</Text>
      <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>{label}</Text>
    </PremiumCard>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: Spacing.md, paddingTop: Spacing.sm },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xl,
    paddingHorizontal: 4,
  },
  headerLeft: {
    flex: 1,
    gap: 10
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  badgeContainer: {
    alignItems: 'flex-end',
    gap: 6,
  },
  headerGreeting: {
    fontFamily: 'Inter-Bold',
    fontSize: 10,
    letterSpacing: 2,
    opacity: 0.6,
  },
  headerTitle: {
    fontFamily: 'Outfit-Bold',
    fontSize: 25,
    letterSpacing: -0.5,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  statusBadgeText: {
    fontFamily: 'Inter-Bold',
    fontSize: 11,
    letterSpacing: 0.5,
  },
  avatarButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1.5,
    padding: 2,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 22,
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    fontFamily: 'Outfit-Bold',
    fontSize: 18,
  },
  sectionZone: { marginBottom: 0 },
  zoneTitle: { ...Typography.labelSmall, fontSize: 10, letterSpacing: 1.5, marginBottom: Spacing.sm, opacity: 0.6 },
  premiumCard: { borderRadius: BorderRadius.lg, padding: Spacing.md, borderWidth: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
  heroCard: { marginBottom: Spacing.sm, padding: Spacing.lg },
  heroMain: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  scoreInfo: { flex: 1 },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  momentumLabel: { ...Typography.labelSmall, fontSize: 10, letterSpacing: 1.2 },
  momentumValue: { ...Typography.h1Hero, fontSize: 48, lineHeight: 56 },
  momentumStats: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: -4, marginBottom: 4 },
  momentumText: { fontSize: 11, fontWeight: '700' },
  breakdownRow: { flexDirection: 'row', gap: 12, marginTop: 8 },
  breakdownItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  breakdownLabel: { fontSize: 10, fontWeight: '700' },
  scoreVisual: { marginLeft: Spacing.md },
  xpCard: { marginBottom: Spacing.lg, padding: Spacing.md },
  xpHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 },
  xpTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  xpTitle: { fontSize: 14, fontWeight: '800' },
  xpSub: { fontSize: 10, fontWeight: '600' },
  xpProgressBarBg: { height: 10, borderRadius: 5, overflow: 'hidden', marginBottom: 6 },
  xpProgressBarFill: { height: '100%', borderRadius: 5 },
  masteryGuideContainer: { marginTop: 16 },
  guideHeader: {
    fontFamily: 'Outfit-Bold',
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 10,
    opacity: 0.6,
  },
  guideTable: {
    gap: 4,
  },
  guideRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: BorderRadius.md,
    backgroundColor: 'rgba(0,0,0,0.02)',
  },
  guideInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  guideActivity: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 12,
  },
  xpPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  xpPillText: {
    fontFamily: 'Outfit-Bold',
    fontSize: 11,
  },
  metricsGrid: { flexDirection: 'row', gap: Spacing.sm },
  metricItem: { flex: 1, alignItems: 'center', paddingVertical: Spacing.md },
  metricIcon: { width: 36, height: 36, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 6 },
  metricValue: { ...Typography.h3, fontSize: 16, fontWeight: '700' },
  metricLabel: { ...Typography.caption, fontSize: 9 },
  leagueBanner: { borderRadius: BorderRadius.lg, borderWidth: 1, padding: Spacing.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: Spacing.sm },
  leagueBannerContent: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  leagueIconWrapper: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(124, 92, 255, 0.1)', justifyContent: 'center', alignItems: 'center' },
  leagueTextWrapper: { justifyContent: 'center', flex: 1 },
  leagueTitle: {
    fontFamily: 'Outfit-Bold',
    fontSize: 15,
    letterSpacing: 0.2,
  },
  leagueSub: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    opacity: 0.8,
  },
  leagueAction: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
  },
  leagueActionText: {
    fontFamily: 'Inter-Bold',
    fontSize: 12,
    letterSpacing: 0.5,
  },
  section: { marginBottom: Spacing.xl },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: Spacing.md, paddingHorizontal: 4 },
  sectionTitle: {
    fontFamily: 'Outfit-Bold',
    fontSize: 16,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  sectionSub: { fontSize: 12, fontWeight: '500' },
  pill: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  pillText: { fontSize: 10, fontWeight: '700' },
  moodCard: { padding: Spacing.lg, minHeight: 220 },
  moodChartContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', height: 180, paddingVertical: 10 },
  moodBarContainer: { alignItems: 'center', flex: 1 },
  moodBarBg: { width: 14, height: 140, borderRadius: 7, backgroundColor: 'rgba(0,0,0,0.05)', overflow: 'hidden', justifyContent: 'flex-end', marginBottom: 8 },
  moodBarFill: { width: '100%', borderRadius: 7 },
  moodBarLabel: { fontSize: 10, fontWeight: '700' },
  moodInsight: { textAlign: 'center', fontSize: 12, fontStyle: 'italic', marginTop: Spacing.sm },
  lifeHistoryCard: { padding: Spacing.lg, minHeight: 220 },
  chartInner: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', paddingBottom: 10, height: 180 },
  barContainer: { alignItems: 'center', flex: 1 },
  barBg: { width: 12, height: 140, borderRadius: 6, backgroundColor: 'rgba(0,0,0,0.05)', overflow: 'hidden', justifyContent: 'flex-end', marginBottom: 8 },
  barFill: { width: '100%', borderRadius: 6 },
  barLabel: { fontSize: 10 },
  chartCard: { padding: Spacing.lg, paddingBottom: Spacing.xxl, minHeight: 240 },
  heatmapCard: { padding: Spacing.lg, minHeight: 260 },
  habitSelector: { marginBottom: Spacing.md },
  habitSelectorContent: { gap: Spacing.sm, paddingBottom: 4 },
  habitChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: BorderRadius.full, borderWidth: 1 },
  habitChipText: { fontSize: 12, fontWeight: '600' },
  selectedHabitTitle: { ...Typography.body, fontSize: 14, fontWeight: '700', marginBottom: Spacing.md },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: Spacing.xl, gap: Spacing.sm },
  emptyText: { fontSize: 13, fontWeight: '500' },
  lockOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  lockCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  lockTitle: {
    fontFamily: 'Outfit-Bold',
    fontSize: 20,
    textAlign: 'center',
    marginBottom: 8,
  },
  lockSub: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
    opacity: 0.8,
  },
  unlockBtn: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: BorderRadius.full,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  unlockBtnText: {
    fontFamily: 'Inter-Bold',
    color: '#FFF',
    fontSize: 16,
  },
  miniProBadge: {
    backgroundColor: '#FBBF24',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 4,
  },
  miniProBadgeText: {
    fontFamily: 'Inter-Bold',
    color: '#000',
    fontSize: 9,
    letterSpacing: 0.5,
  }
});
