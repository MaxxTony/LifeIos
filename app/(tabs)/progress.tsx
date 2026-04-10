import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Spacing, BorderRadius, Typography } from '@/constants/theme';
import { useStore } from '@/store/useStore';
import { GlassCard } from '@/components/GlassCard';

export default function ProgressScreen() {
  const { tasks } = useStore();
  
  const completedCount = tasks.filter(t => t.completed).length;
  const totalCount = tasks.length;
  const completionRate = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  // Mock weekly data for the chart
  const weeklyData = [
    { day: 'M', value: 40 },
    { day: 'T', value: 60 },
    { day: 'W', value: 80 },
    { day: 'T', value: 50 },
    { day: 'F', value: 90 },
    { day: 'S', value: 30 },
    { day: 'S', value: 70 },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>Your Progress</Text>
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <GlassCard style={styles.statCard}>
            <Text style={styles.statValue}>{completedCount}</Text>
            <Text style={styles.statLabel}>Tasks Done</Text>
          </GlassCard>
          <GlassCard style={styles.statCard}>
            <Text style={styles.statValue}>{Math.round(completionRate)}%</Text>
            <Text style={styles.statLabel}>Completion</Text>
          </GlassCard>
        </View>

        {/* Weekly Chart */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Weekly Activity</Text>
          <GlassCard style={styles.chartCard}>
            <View style={styles.chart}>
              {weeklyData.map((d, i) => (
                <View key={i} style={styles.chartCol}>
                  <View style={[styles.bar, { height: `${d.value}%` }]} />
                  <Text style={styles.chartLabel}>{d.day}</Text>
                </View>
              ))}
            </View>
          </GlassCard>
        </View>

        {/* Mood History */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Mood History</Text>
          <GlassCard>
            <Text style={styles.bodyText}>Keep tracking your mood daily to see patterns emerge here.</Text>
          </GlassCard>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  scrollContent: {
    padding: Spacing.md,
  },
  header: {
    marginBottom: Spacing.xl,
  },
  title: {
    ...Typography.h1,
    color: Colors.dark.text,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    ...Typography.h2,
    color: Colors.dark.primary,
  },
  statLabel: {
    ...Typography.caption,
    color: Colors.dark.textSecondary,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    ...Typography.h3,
    color: Colors.dark.text,
    marginBottom: Spacing.md,
  },
  chartCard: {
    paddingBottom: Spacing.lg,
  },
  chart: {
    flexDirection: 'row',
    height: 150,
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingTop: Spacing.lg,
  },
  chartCol: {
    alignItems: 'center',
    flex: 1,
  },
  bar: {
    width: 12,
    backgroundColor: Colors.dark.primary,
    borderRadius: 6,
    marginBottom: Spacing.sm,
  },
  chartLabel: {
    ...Typography.caption,
    fontSize: 10,
  },
  bodyText: {
    ...Typography.body,
    color: Colors.dark.textSecondary,
    textAlign: 'center',
  }
});
