import React, { useMemo, useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Spacing, BorderRadius, Typography } from '@/constants/theme';
import { useStore } from '@/store/useStore';
import { useThemeColors } from '@/hooks/useThemeColors';
import { CircularProgress } from '@/components/CircularProgress';
import { FocusPulseChart } from '@/components/FocusPulseChart';
import { HabitCalendar } from '@/components/HabitCalendar';
import { formatLocalDate, getTodayLocal } from '@/utils/dateUtils';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Brain, Target, Zap, TrendingUp, Award, Info, Sparkles } from 'lucide-react-native';
import { useProfileStats } from '@/hooks/useProfileStats';

const { width } = Dimensions.get('window');

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
  const lifeScoreHistory = useStore(s => s.lifeScoreHistory);
  const updateLifeScoreHistory = useStore(s => s.actions.updateLifeScoreHistory);
  const colors = useThemeColors();

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
    xpNeeded 
  } = useProfileStats();

  // Formatting Data...
  const focusChartData = useMemo(() => {
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

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={[styles.headerGreeting, { color: colors.textSecondary }]}>YOUR JOURNEY</Text>
              <Text style={[styles.headerTitle, { color: colors.text }]}>Evolution</Text>
            </View>
            <TouchableOpacity style={[styles.levelBadge, { backgroundColor: colors.primary + '15', borderColor: colors.primary + '30' }]}>
              <Award size={14} color={colors.primary} />
              <Text style={[styles.levelBadgeText, { color: colors.primary }]}>LVL {userLevel}</Text>
            </TouchableOpacity>
          </View>

          {/* ZONE 1: DAILY PULSE */}
          <View style={styles.sectionZone}>
            <Text style={[styles.zoneTitle, { color: colors.textSecondary }]}>Daily Pulse</Text>
            
            <PremiumCard style={styles.heroCard}>
              <View style={styles.heroMain}>
                <View style={styles.scoreInfo}>
                  <View style={styles.labelRow}>
                    <Text style={[styles.momentumLabel, { color: colors.textSecondary }]}>LIFE MOMENTUM</Text>
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
              <MetricItem icon={<Brain size={18} color={colors.success} />} value={`${(focusSecondsToday/3600).toFixed(1)}h`} label="Focus" color={colors.success} />
              <MetricItem icon={<Target size={18} color={colors.secondary} />} value={`${completedTasksCount}`} label="Tasks" color={colors.secondary} />
              <MetricItem icon={<Zap size={18} color={colors.danger} />} value={`${completedHabitsCount}`} label="Habits" color={colors.danger} />
            </View>
          </View>

          {/* ZONE 2: GROWTH & EVOLUTION */}
          <View style={styles.sectionZone}>
            <Text style={[styles.zoneTitle, { color: colors.textSecondary }]}>Growth & Evolution</Text>
            
            <PremiumCard style={styles.xpCard}>
              <View style={styles.xpHeader}>
                <View style={styles.xpTitleRow}>
                  <Sparkles size={16} color={colors.primary} />
                  <Text style={[styles.xpTitle, { color: colors.text }]}>Experience (XP)</Text>
                </View>
                <Text style={[styles.xpSub, { color: colors.textSecondary }]}>{xpNeeded} XP to Level {userLevel + 1}</Text>
              </View>
              
              <View style={[styles.xpProgressBarBg, { backgroundColor: colors.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]}>
                <LinearGradient colors={[colors.primary, colors.secondary]} start={{x:0,y:0}} end={{x:1,y:0}} style={[styles.xpProgressBarFill, { width: `${xpProgress * 100}%` } ]} />
              </View>
              
              <View style={styles.masteryGuide}>
                <View style={styles.guideItem}>
                  <Target size={12} color={colors.secondary} />
                  <Text style={[styles.guideText, { color: colors.textSecondary }]}>Task: +15 XP</Text>
                </View>
                <View style={styles.guideItem}>
                  <Zap size={12} color={colors.danger} />
                  <Text style={[styles.guideText, { color: colors.textSecondary }]}>Habit: +10 XP</Text>
                </View>
                <View style={styles.guideItem}>
                  <Brain size={12} color={colors.success} />
                  <Text style={[styles.guideText, { color: colors.textSecondary }]}>Focus Hour: +20 XP</Text>
                </View>
                <View style={styles.guideItem}>
                  <Award size={12} color={colors.primary} />
                  <Text style={[styles.guideText, { color: colors.textSecondary }]}>Quest: +30-100 XP</Text>
                </View>
              </View>
            </PremiumCard>

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Mindset Synergy</Text>
                <View style={[styles.pill, { backgroundColor: colors.success + '10' }]}><Text style={[styles.pillText, { color: colors.success }]}>Avg: {avgMood}</Text></View>
              </View>
              <PremiumCard style={styles.moodCard}>
                <View style={styles.moodChartContainer}>
                  {moodChartData.map((item, i) => {
                    const m = item.mood;
                    const hasData = m > 0;
                    const h = hasData ? m * 14 : 4;
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
              </PremiumCard>
            </View>

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Life Evolution</Text>
                <Text style={[styles.sectionSub, { color: colors.textSecondary }]}>Weekly Score</Text>
              </View>
              <PremiumCard style={styles.lifeHistoryCard}>
                <View style={[styles.chartInner, { height: 120 }]}>
                  {lifeScoreChartData.map((item, i) => {
                    const h = item.score > 0 ? (item.score / 100) * 80 : 4;
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
              </PremiumCard>
            </View>

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Focus Intensity</Text>
                <Text style={[styles.sectionSub, { color: colors.textSecondary }]}>Last 7 Days</Text>
              </View>
              <PremiumCard style={styles.chartCard}><FocusPulseChart data={focusChartData} goal={focusGoalHours || 8} /></PremiumCard>
            </View>
          </View>

          {/* ZONE 3: MASTERY */}
          <View style={styles.sectionZone}>
            <Text style={[styles.zoneTitle, { color: colors.textSecondary }]}>Mastery</Text>
            <PremiumCard style={styles.heatmapCard}>
              <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: Spacing.md }]}>Habit Consistency</Text>
              {habits.length > 0 ? (
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
                  <Text style={[styles.selectedHabitTitle, { color: colors.text }]}>{habits[selectedHabitIndex]?.title}</Text>
                  <HabitCalendar completedDays={habits[selectedHabitIndex]?.completedDays ?? []} createdAt={habits[selectedHabitIndex]?.createdAt ?? Date.now()} />
                </View>
              ) : (
                <View style={styles.emptyState}><Ionicons name="calendar-outline" size={32} color={colors.textSecondary + '40'} /><Text style={[styles.emptyText, { color: colors.textSecondary }]}>Start a habit to track your consistency.</Text></View>
              )}
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
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.lg },
  headerGreeting: { ...Typography.labelSmall, fontSize: 10, letterSpacing: 2 },
  headerTitle: { ...Typography.h1, fontSize: 32, marginTop: -4 },
  levelBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: BorderRadius.md, borderWidth: 1 },
  levelBadgeText: { fontFamily: 'Inter-Bold', fontSize: 12 },
  sectionZone: { marginBottom: Spacing.xl },
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
  masteryGuide: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
    gap: 12,
  },
  guideItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  guideText: {
    fontSize: 10,
    fontWeight: '700',
  },
  metricsGrid: { flexDirection: 'row', gap: Spacing.sm },
  metricItem: { flex: 1, alignItems: 'center', paddingVertical: Spacing.md },
  metricIcon: { width: 36, height: 36, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 6 },
  metricValue: { ...Typography.h3, fontSize: 16, fontWeight: '700' },
  metricLabel: { ...Typography.caption, fontSize: 9 },
  section: { marginBottom: Spacing.lg },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: Spacing.md, paddingHorizontal: 4 },
  sectionTitle: { ...Typography.h3, fontSize: 18 },
  sectionSub: { fontSize: 12, fontWeight: '500' },
  pill: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  pillText: { fontSize: 10, fontWeight: '700' },
  moodCard: { padding: Spacing.md },
  moodChartContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', height: 110, paddingVertical: 10 },
  moodBarContainer: { alignItems: 'center', flex: 1 },
  moodBarBg: { width: 14, height: 70, borderRadius: 7, backgroundColor: 'rgba(0,0,0,0.05)', overflow: 'hidden', justifyContent: 'flex-end', marginBottom: 8 },
  moodBarFill: { width: '100%', borderRadius: 7 },
  moodBarLabel: { fontSize: 10, fontWeight: '700' },
  moodInsight: { textAlign: 'center', fontSize: 12, fontStyle: 'italic', marginTop: Spacing.sm },
  lifeHistoryCard: { padding: Spacing.md },
  chartInner: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', paddingBottom: 10 },
  barContainer: { alignItems: 'center', flex: 1 },
  barBg: { width: 12, height: 80, borderRadius: 6, backgroundColor: 'rgba(0,0,0,0.05)', overflow: 'hidden', justifyContent: 'flex-end', marginBottom: 8 },
  barFill: { width: '100%', borderRadius: 6 },
  barLabel: { fontSize: 10 },
  chartCard: { padding: Spacing.md, paddingBottom: Spacing.xl },
  heatmapCard: { padding: Spacing.md },
  habitSelector: { marginBottom: Spacing.md },
  habitSelectorContent: { gap: Spacing.sm, paddingBottom: 4 },
  habitChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: BorderRadius.full, borderWidth: 1 },
  habitChipText: { fontSize: 12, fontWeight: '600' },
  selectedHabitTitle: { ...Typography.body, fontSize: 14, fontWeight: '700', marginBottom: Spacing.md },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: Spacing.xl, gap: Spacing.sm },
  emptyText: { fontSize: 13, fontWeight: '500' }
});
