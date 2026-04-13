import { DailyTasksWidget } from '@/components/DailyTasksWidget';
import { DashboardAIButton } from '@/components/DashboardAIButton';
import { FocusWidget } from '@/components/FocusWidget';
import { HabitGrid } from '@/components/HabitGrid';
import { MoodTrend } from '@/components/MoodTrend';
import { Spacing, Typography } from '@/constants/theme';
import { useStore } from '@/store/useStore';
import { useThemeColors } from '@/hooks/useThemeColors';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const getGreeting = (): { text: string; icon: 'sunny' | 'partly-sunny' | 'cloudy-night' | 'moon' } => {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return { text: 'Good morning', icon: 'sunny' };
  if (hour >= 12 && hour < 17) return { text: 'Good afternoon', icon: 'partly-sunny' };
  if (hour >= 17 && hour < 21) return { text: 'Good evening', icon: 'cloudy-night' };
  return { text: 'Good night', icon: 'moon' };
};

export default function HomeScreen() {
  const userName = useStore(s => s.userName);
  const colors = useThemeColors();
  const { dashboardTheme } = colors;
  const greeting = getGreeting();
  // checkMissedTasks is now handled globally in _layout.tsx


  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Background with a subtle gradient/texture feel */}
      <View style={StyleSheet.absoluteFill}>
        <LinearGradient
          colors={dashboardTheme.bg}
          style={StyleSheet.absoluteFill}
        />
        <View style={[styles.glowBackground, { top: -100, right: -100, backgroundColor: dashboardTheme.glow1 }]} />
        <View style={[styles.glowBackground, { bottom: -150, left: -150, backgroundColor: dashboardTheme.glow2 }]} />
      </View>

      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <View>
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
              <Text style={[styles.userName, { color: colors.text }]}>
                {userName || 'User'}!
              </Text>
            </View>
          </View>

          {/* Vertical Stack Layout */}
          <View style={styles.stack}>
            {/* Card 1: Daily Focus */}
            <View style={styles.cardContainer}>
              <FocusWidget />
            </View>

            {/* Card 2: Daily Task List */}
            <View style={styles.cardContainer}>
              <DailyTasksWidget />
            </View>

            {/* Card 3: Mood (Placeholder/Simplified) */}
            <View style={styles.cardContainer}>
              <MoodTrend />
            </View>

            {/* Card 4: Habit Streaks (Placeholder/Simplified) */}
            <View style={styles.cardContainer}>
              <HabitGrid />
            </View>
          </View>

          {/* AI Call to Action */}
          <View style={styles.aiSection}>
            <DashboardAIButton />
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xl,
    paddingHorizontal: 4,
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
  },
  stack: {
    gap: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  cardContainer: {
    width: '100%',
  },
  aiSection: {
    alignItems: 'center',
    marginTop: Spacing.md,
  }
});

