import { DailyTasksWidget } from '@/components/DailyTasksWidget';
import { DashboardAIButton } from '@/components/DashboardAIButton';
import { FocusWidget } from '@/components/FocusWidget';
import { HabitGrid } from '@/components/HabitGrid';
import { MoodTrend } from '@/components/MoodTrend';
import { Spacing, Typography } from '@/constants/theme';
import { useStore } from '@/store/useStore';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';


export default function HomeScreen() {
  const { userName, checkMissedTasks, performDailyReset } = useStore();

  useEffect(() => {
    // Initial checks and maintenance
    checkMissedTasks();
    performDailyReset();

    // Check every minute for missed tasks
    const interval = setInterval(checkMissedTasks, 60000);
    return () => clearInterval(interval);
  }, []);


  return (
    <View style={styles.container}>
      {/* Background with a subtle gradient/texture feel */}
      <View style={StyleSheet.absoluteFill}>
        <LinearGradient
          colors={['#0B0B0F', '#1A1A2E']}
          style={StyleSheet.absoluteFill}
        />
        <View style={[styles.glowBackground, { top: -100, right: -100, backgroundColor: '#7C5CFF15' }]} />
        <View style={[styles.glowBackground, { bottom: -150, left: -150, backgroundColor: '#5B8CFF10' }]} />
      </View>

      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.greeting}>Good morning,</Text>
              <Text style={styles.userName}>{userName || 'User'}!</Text>
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
    backgroundColor: '#000',
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
    filter: 'blur(80px)',
    opacity: 0.5,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xl,
    paddingHorizontal: 4,
  },
  greeting: {
    ...Typography.body,
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
  },
  userName: {
    ...Typography.h1,
    color: '#FFF',
    fontSize: 28,
    fontFamily: 'Outfit-Bold',
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

