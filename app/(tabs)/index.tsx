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
import React, { useEffect, useRef } from 'react';
import { Animated, Easing, ScrollView, StyleSheet, Text, View } from 'react-native';
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
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(shimmer, { toValue: 0, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const opacity = shimmer.interpolate({ inputRange: [0, 1], outputRange: [0.4, 0.9] });
  const base = colors.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)';

  return (
    <Animated.View
      style={{
        width: width as any,
        height,
        borderRadius,
        backgroundColor: base,
        opacity,
      }}
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

export default function HomeScreen() {
  const userName = useStore(s => s.userName);
  const isHydrated = useStore(s => s._hasHydrated);
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
        {!isHydrated ? (
          <ScrollView showsVerticalScrollIndicator={false}>
            <HomeSkeleton />
          </ScrollView>
        ) : (
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

              {/* Card 3: Mood */}
              <View style={styles.cardContainer}>
                <MoodTrend />
              </View>

              {/* Card 4: Habit Streaks */}
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
        )}
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
