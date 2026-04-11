import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Spacing, BorderRadius, Typography } from '@/constants/theme';
import { useStore } from '@/store/useStore';
import { GlassCard } from '@/components/GlassCard';
import { CircularProgress } from '@/components/CircularProgress';
import { FocusPulseChart } from '@/components/FocusPulseChart';
import { HabitHeatmap } from '@/components/HabitHeatmap';
import { formatLocalDate, getTodayLocal } from '@/utils/dateUtils';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

export default function ProgressScreen() {
  const { tasks, habits, focusHistory, focusSession, focusGoalHours } = useStore();
  
  // 1. Calculate Today's Stats
  const today = getTodayLocal();
  
  const completedTasks = tasks.filter(t => t.completed).length;
  const totalTasks = tasks.length;
  
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
    <View style={styles.container}>
      {/* Dynamic Background Atmosphere */}
      <View style={styles.backgroundContainer}>
        <View style={[styles.glow, { top: '5%', right: '-15%', backgroundColor: Colors.dark.primary, opacity: 0.12 }]} />
        <View style={[styles.glow, { bottom: '10%', left: '-20%', backgroundColor: '#00D68F', opacity: 0.08 }]} />
        <View style={[styles.glow, { top: '30%', left: '10%', width: 200, height: 200, backgroundColor: Colors.dark.secondary, opacity: 0.05 }]} />
      </View>
      
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Hero Navigation/Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Evolution</Text>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>Level 04</Text>
            </View>
          </View>

          {/* Hero Section: Life Score */}
          <View style={styles.heroSection}>
            <View style={styles.heroTextContainer}>
              <Text style={styles.heroSub}>Today's Momentum</Text>
            </View>
            <View style={styles.scoreContainer}>
              <CircularProgress size={200} strokeWidth={16} progress={lifeScore}>
                <View style={styles.innerContent}>
                  <Text style={styles.scoreValue}>{lifeScore}%</Text>
                  <Text style={styles.scoreLabel}>Daily Goal</Text>
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
              color="#00D68F"
            />
            <StatItem 
              icon="checkmark-circle-outline" 
              value={`${completedTasks}`} 
              label="Tasks" 
              color="#3366FF"
            />
            <StatItem 
              icon="flame-outline" 
              value={`${completedHabits}`} 
              label="Habits" 
              color="#FF3D71"
            />
          </View>

          {/* Deep Focus Chart */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Deep Focus Pulse</Text>
              <Ionicons name="trending-up" size={16} color="rgba(255,255,255,0.3)" />
            </View>
            <GlassCard style={styles.chartCard}>
              <FocusPulseChart data={focusChartData} goal={focusGoalHours || 8} />
            </GlassCard>
          </View>

          {/* Habit Mastery Heatmap */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Habit Mastery</Text>
              <Text style={styles.statMini}>30 Days Heatmap</Text>
            </View>
            <GlassCard style={styles.heatmapCard}>
              {habits && habits.length > 0 ? (
                <View>
                   <Text style={styles.habitItemTitle}>{habits[0].title}</Text>
                   <HabitHeatmap 
                    completedDays={habits[0].completedDays} 
                    createdAt={habits[0].createdAt} 
                  />
                </View>
              ) : (
                <Text style={styles.placeholderText}>Track your first habit to unlock consistency map.</Text>
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
  return (
    <GlassCard style={styles.statItem}>
      <View style={[styles.iconContainer, { backgroundColor: color + '15' }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#050510', // Deeper black-blue background
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
    filter: 'blur(100px)',
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
    color: '#FFF',
    fontSize: 28,
  },
  badge: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  badgeText: {
    ...Typography.labelSmall,
    color: Colors.dark.primary,
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
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: 2,
    fontSize: 12,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  scoreContainer: {
    // Subtle shadow for the circle area
    elevation: 25,
    shadowColor: Colors.dark.primary,
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
    color: '#FFF',
    includeFontPadding: false,
    lineHeight: 64,
  },
  scoreLabel: {
    ...Typography.caption,
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
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
    color: '#FFF',
    fontSize: 18,
    fontWeight: '700',
  },
  statLabel: {
    ...Typography.caption,
    fontSize: 10,
    color: 'rgba(255,255,255,0.4)',
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
    color: 'rgba(255,255,255,0.9)',
    fontSize: 18,
  },
  statMini: {
    ...Typography.caption,
    color: 'rgba(255,255,255,0.3)',
    fontSize: 10,
  },
  chartCard: {
    padding: Spacing.md,
    paddingBottom: Spacing.xl, // Extra room for chart labels
  },
  heatmapCard: {
    padding: Spacing.md,
  },
  habitItemTitle: {
    ...Typography.body,
    color: 'rgba(255,255,255,0.6)',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: Spacing.md,
  },
  placeholderText: {
    ...Typography.body,
    color: 'rgba(255,255,255,0.3)',
    textAlign: 'center',
    paddingVertical: 24,
    fontSize: 14,
  }
});
