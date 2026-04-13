import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Spacing, BorderRadius, Typography } from '@/constants/theme';
import { useStore } from '@/store/useStore';
import { useThemeColors } from '@/hooks/useThemeColors';
import { GlassCard } from '@/components/GlassCard';
import { CircularProgress } from '@/components/CircularProgress';
import { FocusPulseChart } from '@/components/FocusPulseChart';
import { HabitHeatmap } from '@/components/HabitHeatmap';
import { formatLocalDate, getTodayLocal } from '@/utils/dateUtils';
import { Ionicons } from '@expo/vector-icons';

export default function ProgressScreen() {
  const { tasks, habits, focusHistory, focusSession, focusGoalHours } = useStore();
  const colors = useThemeColors();
  const [selectedHabitIndex, setSelectedHabitIndex] = useState(0);

  // 1. Calculate Today's Stats
  const today = getTodayLocal();
  
  // Filter to today's tasks only for the daily score
  const todayTasks = tasks.filter(t => t.date === today);
  const completedTasks = todayTasks.filter(t => t.completed).length;
  const totalTasks = todayTasks.length;
  
  const completedHabits = habits.filter(h => h.completedDays.includes(today)).length;
  const totalHabits = habits.length;

  const focusSecondsToday = focusSession?.totalSecondsToday || 0;
  const focusGoalSeconds = (focusGoalHours || 8) * 3600;
  const focusCompletionPerc = Math.min((focusSecondsToday / focusGoalSeconds) * 100, 100);

  // Overall Score (Average of Tasks, Habits, Focus)
  const taskCompletionPerc = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
  const habitCompletionPerc = totalHabits > 0 ? (completedHabits / totalHabits) * 100 : 0;
  
  const lifeScore = Math.round(
    (taskCompletionPerc + habitCompletionPerc + focusCompletionPerc) / 3
  );

  // Level: based on total habit completions + tasks completed (all-time)
  const totalCompletions = habits.reduce((acc, h) => acc + h.completedDays.length, 0)
    + tasks.filter(t => t.completed).length;
  const userLevel = Math.max(1, Math.floor(totalCompletions / 10) + 1);

  // 2. Format Focus History for Chart
  const focusChartData = useMemo(() => {
    const data = [];
    const DAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dStr = formatLocalDate(d);
      
      let seconds = focusHistory?.[dStr] || 0;
      if (i === 0) seconds = focusSecondsToday;
      
      data.push({
        day: DAYS[d.getDay()],
        hours: parseFloat((seconds / 3600).toFixed(1)),
      });
    }
    return data;
  }, [focusHistory, focusSecondsToday]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Dynamic Background Atmosphere */}
      <View style={styles.backgroundContainer}>
        <View style={[styles.glow, { top: '5%', right: '-15%', backgroundColor: colors.primary, opacity: colors.isDark ? 0.12 : 0.08 }]} />
        <View style={[styles.glow, { bottom: '10%', left: '-20%', backgroundColor: colors.success, opacity: colors.isDark ? 0.08 : 0.05 }]} />
        <View style={[styles.glow, { top: '30%', left: '10%', width: 200, height: 200, backgroundColor: colors.secondary, opacity: colors.isDark ? 0.05 : 0.03 }]} />
      </View>
      
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Hero Navigation/Header */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text }]}>Evolution</Text>
            <View style={[styles.badge, { backgroundColor: colors.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)', borderColor: colors.border }]}>
              <Text style={[styles.badgeText, { color: colors.primary }]}>Level {String(userLevel).padStart(2, '0')}</Text>
            </View>
          </View>

          {/* Hero Section: Life Score */}
          <View style={styles.heroSection}>
            <View style={styles.heroTextContainer}>
              <Text style={[styles.heroSub, { color: colors.textSecondary + '60' }]}>Today's Momentum</Text>
            </View>
            <View style={[styles.scoreContainer, { shadowColor: colors.primary }]}>
              <CircularProgress size={200} strokeWidth={16} progress={lifeScore}>
                <View style={styles.innerContent}>
                  <Text style={[styles.scoreValue, { color: colors.text }]}>{lifeScore}%</Text>
                  <Text style={[styles.scoreLabel, { color: colors.textSecondary + '60' }]}>Daily Goal</Text>
                </View>
              </CircularProgress>
            </View>
          </View>

          {/* Stats Grid */}
          <View style={styles.statsRow}>
            <StatItem 
              icon="timer-outline" 
              value={`${(focusSecondsToday/3600).toFixed(1)}h`} 
              label="Focused" 
              color={colors.success}
            />
            <StatItem 
              icon="checkmark-circle-outline" 
              value={`${completedTasks}`} 
              label="Tasks" 
              color={colors.secondary}
            />
            <StatItem 
              icon="flame-outline" 
              value={`${completedHabits}`} 
              label="Habits" 
              color={colors.danger}
            />
          </View>

          {/* Deep Focus Chart */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text + 'E6' }]}>Deep Focus Pulse</Text>
              <Ionicons name="trending-up" size={16} color={colors.textSecondary + '40'} />
            </View>
            <GlassCard style={styles.chartCard}>
              <FocusPulseChart data={focusChartData} goal={focusGoalHours || 8} />
            </GlassCard>
          </View>

          {/* Habit Mastery Heatmap */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text + 'E6' }]}>Habit Mastery</Text>
              <Text style={[styles.statMini, { color: colors.textSecondary + '40' }]}>30 Days Heatmap</Text>
            </View>
            <GlassCard style={styles.heatmapCard}>
              {habits && habits.length > 0 ? (
                <View>
                  {/* Habit selector chips */}
                  {habits.length > 1 && (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.habitSelectorScroll} contentContainerStyle={styles.habitSelectorContent}>
                      {habits.map((h, i) => (
                        <TouchableOpacity
                          key={h.id}
                          onPress={() => setSelectedHabitIndex(i)}
                          style={[
                            styles.habitChip,
                            { backgroundColor: colors.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)', borderColor: colors.border },
                            selectedHabitIndex === i && { backgroundColor: colors.primary + '20', borderColor: colors.primary }
                          ]}
                        >
                          <Text style={[styles.habitChipText, { color: selectedHabitIndex === i ? colors.primary : colors.textSecondary }]}>
                            {h.icon} {h.title}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  )}
                  <Text style={[styles.habitItemTitle, { color: colors.textSecondary, marginTop: habits.length > 1 ? Spacing.sm : 0 }]}>
                    {habits[selectedHabitIndex]?.title}
                  </Text>
                  <HabitHeatmap
                    completedDays={habits[selectedHabitIndex]?.completedDays ?? []}
                    createdAt={habits[selectedHabitIndex]?.createdAt ?? Date.now()}
                  />
                </View>
              ) : (
                <Text style={[styles.placeholderText, { color: colors.textSecondary + '40' }]}>Track your first habit to unlock consistency map.</Text>
              )}
            </GlassCard>
          </View>

          <View style={{ height: 60 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function StatItem({ icon, value, label, color }: { icon: any, value: string, label: string, color: string }) {
  const colors = useThemeColors();
  return (
    <GlassCard style={styles.statItem}>
      <View style={[styles.iconContainer, { backgroundColor: color + '15' }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <Text style={[styles.statValue, { color: colors.text }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.textSecondary + '60' }]}>{label}</Text>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backgroundContainer: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  glow: {
    position: 'absolute',
    width: 350,
    height: 350,
    borderRadius: 175,
  },
  scrollContent: {
    padding: Spacing.md,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
    marginTop: Spacing.sm,
  },
  title: {
    ...Typography.h1,
    fontSize: 28,
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
  },
  badgeText: {
    ...Typography.labelSmall,
    fontSize: 10,
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  heroTextContainer: {
    marginBottom: Spacing.lg,
  },
  heroSub: {
    ...Typography.body,
    letterSpacing: 2,
    fontSize: 12,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  scoreContainer: {
    // Subtle shadow for the circle area
    elevation: 25,
    shadowRadius: 50,
    shadowOpacity: 0.15,
  },
  innerContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreValue: {
    ...Typography.h1Hero,
    fontSize: 54,
    includeFontPadding: false,
    lineHeight: 64,
  },
  scoreLabel: {
    ...Typography.caption,
    fontSize: 12,
    marginTop: -8,
  },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: 4,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statValue: {
    ...Typography.h3,
    fontSize: 18,
    fontWeight: '700',
  },
  statLabel: {
    ...Typography.caption,
    fontSize: 10,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    ...Typography.h3,
    fontSize: 18,
  },
  statMini: {
    ...Typography.caption,
    fontSize: 10,
  },
  chartCard: {
    padding: Spacing.md,
    paddingBottom: Spacing.xl, // Extra room for chart labels
  },
  heatmapCard: {
    padding: Spacing.md,
  },
  habitSelectorScroll: {
    marginBottom: Spacing.sm,
  },
  habitSelectorContent: {
    gap: Spacing.sm,
    paddingBottom: 4,
  },
  habitChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  habitChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  habitItemTitle: {
    ...Typography.body,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: Spacing.md,
  },
  placeholderText: {
    ...Typography.body,
    textAlign: 'center',
    paddingVertical: 24,
    fontSize: 14,
  }
});
