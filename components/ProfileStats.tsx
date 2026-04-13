import { useStore } from '@/store/useStore';
import { useThemeColors } from '@/hooks/useThemeColors';
import { Spacing, Typography } from '@/constants/theme';
import { CheckCircle2, Clock, Trophy, Zap } from 'lucide-react-native';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { CircularProgress } from './CircularProgress';
import { GlassCard } from './GlassCard';

export function ProfileStats() {
  // Selector pattern: focusSecondsToday as primitive avoids re-render on every tick.
  const tasks = useStore(s => s.tasks);
  const habits = useStore(s => s.habits);
  const focusSecondsToday = useStore(s => s.focusSession.totalSecondsToday);
  const getStreak = useStore(s => s.getStreak);
  const colors = useThemeColors();

  const completedTasksToday = tasks.filter(t => t.completed).length;
  const totalTasksToday = tasks.length;
  const taskCompletionRate = totalTasksToday > 0
    ? Math.round((completedTasksToday / totalTasksToday) * 100)
    : 0;

  const totalFocusMinutes = Math.floor(focusSecondsToday / 60);
  const focusHours = (totalFocusMinutes / 60).toFixed(1);

  const streaks = habits.map(h => getStreak(h.id));
  const maxStreak = streaks.length > 0 ? Math.max(...streaks) : 0;

  return (
    <View style={styles.container}>
      <View style={styles.grid}>
        <StatCard
          icon={<Trophy size={20} color={colors.isDark ? '#FFD700' : '#B8860B'} />}
          label="Best Streak"
          value={`${maxStreak} Days`}
          color={colors.isDark ? '#FFD700' : '#B8860B'}
        />

        <GlassCard style={styles.card}>
          <View style={styles.circularContainer}>
            <CircularProgress size={60} strokeWidth={6} progress={taskCompletionRate}>
              <CheckCircle2 size={18} color={colors.success} />
            </CircularProgress>
          </View>
          <Text style={[styles.cardValue, { color: colors.success }]}>{taskCompletionRate}%</Text>
          <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>Tasks Today</Text>
        </GlassCard>

        <StatCard
          icon={<Clock size={20} color={colors.primary} />}
          label="Focus Time"
          value={`${focusHours}h`}
          color={colors.primary}
        />

        <StatCard
          icon={<Zap size={20} color={colors.secondary} />}
          label="Active Habits"
          value={`${habits.length}`}
          color={colors.secondary}
        />
      </View>
    </View>
  );
}

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  const colors = useThemeColors();
  return (
    <GlassCard style={styles.card}>
      <View style={styles.iconWrapper}>
        {icon}
        <View style={[styles.glow, { backgroundColor: color }]} />
      </View>
      <Text style={[styles.cardValue, { color }]}>{value}</Text>
      <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>{label}</Text>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.xl,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  card: {
    width: '47%',
    padding: Spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circularContainer: {
    marginBottom: Spacing.sm,
  },
  iconWrapper: {
    marginBottom: Spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  glow: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderRadius: 10,
    opacity: 0.2,
  },
  cardValue: {
    ...Typography.h2,
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 4,
    textAlign: 'center',
  },
  cardLabel: {
    ...Typography.labelSmall,
    fontSize: 10,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
});
