import { BorderRadius, Spacing, Typography } from '@/constants/theme';
import { useThemeColors } from '@/hooks/useThemeColors';
import { getMoodConfig, getMoodFromLegacy } from '@/constants/moods';
import { useStore } from '@/store/useStore';
import { formatLocalDate, getTodayLocal } from '@/utils/dateUtils';
import { BlurView } from 'expo-blur';
import React, { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { MoodEmoji } from './MoodEmoji';

export function MoodTrend() {
  const router = useRouter();
  const colors = useThemeColors();
  const { moodHistory } = useStore();

  const today = getTodayLocal();

  // Get today's mood entry
  const todayMood = useMemo(() => {
    const entry = moodHistory[today];
    if (!entry) return null;
    // Handle legacy string moods
    const level = typeof entry.mood === 'number' ? entry.mood : getMoodFromLegacy(entry.mood as any);
    return { ...entry, level };
  }, [moodHistory, today]);

  // Get last 7 days of moods for mini trend
  const weekTrend = useMemo(() => {
    const days: { date: string; level: number | null }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = formatLocalDate(d);
      const entry = moodHistory[dateStr];
      const level = entry 
        ? (typeof entry.mood === 'number' ? entry.mood : getMoodFromLegacy(entry.mood as any))
        : null;
      days.push({ date: dateStr, level });
    }
    return days;
  }, [moodHistory]);

  const todayConfig = todayMood ? getMoodConfig(todayMood.level) : null;

  return (
    <View style={styles.container}>
      <BlurView intensity={20} tint="dark" style={styles.blur}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Mood</Text>
            <TouchableOpacity
              style={styles.historyBtn}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push('/mood-history');
              }}
            >
              <Ionicons name="calendar-outline" size={14} color="rgba(255,255,255,0.5)" />
            </TouchableOpacity>
        </View>

        {/* Main Content */}
        {todayMood ? (
          // Logged state: Show today's mood character
          <TouchableOpacity
            style={styles.loggedState}
            onPress={() => router.push('/mood-history')}
            activeOpacity={0.7}
          >
            <View style={styles.moodFaceLarge}>
              <MoodEmoji level={todayMood.level} size={48} />
            </View>
            <View style={styles.loggedInfo}>
              <Text style={[styles.moodLabelLarge, { color: todayConfig?.color }]}>
                {todayConfig?.label}
              </Text>
              <Text style={styles.loggedSub}>Today's Mood</Text>
            </View>
          </TouchableOpacity>
        ) : (
          // Empty state: CTA to log
          <TouchableOpacity
            style={styles.ctaState}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              router.push('/mood-log');
            }}
            activeOpacity={0.7}
          >
            <LinearGradient
              colors={[colors.primaryTransparent, 'rgba(91,140,255,0.08)']}
              style={styles.ctaGradient}
            >
              <Ionicons name="add-circle-outline" size={28} color={colors.primary} />
              <Text style={[styles.ctaText, { color: colors.primary }]}>How are you feeling?</Text>
            </LinearGradient>
          </TouchableOpacity>
        )}

        {/* Mini 7-day trend */}
        <View style={styles.trendRow}>
          {weekTrend.map((day, i) => {
            const config = day.level ? getMoodConfig(day.level) : null;
            const isToday = day.date === today;
            return (
              <View key={i} style={styles.trendDay}>
                <View
                  style={[
                    styles.trendDot,
                    config ? { backgroundColor: config.color } : { backgroundColor: 'rgba(255,255,255,0.06)' },
                    isToday && styles.trendDotToday,
                  ]}
                />
                <Text style={[styles.trendLabel, isToday && styles.trendLabelToday]}>
                  {['S','M','T','W','T','F','S'][new Date(day.date).getDay()]}
                </Text>
              </View>
            );
          })}
        </View>
      </BlurView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    height: 200,
  },
  blur: {
    flex: 1,
    padding: Spacing.md,
    justifyContent: 'space-between',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerRight: {
    flexDirection: 'row',
    gap: 8,
  },
  title: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.6)',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  historyBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Logged state
  loggedState: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 4,
  },
  moodFaceLarge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 5,
  },
  loggedInfo: {
    gap: 2,
  },
  moodLabelLarge: {
    fontSize: 22,
    fontFamily: 'Outfit-Bold',
  },
  loggedSub: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.35)',
    fontWeight: '600',
  },
  // CTA state
  ctaState: {
    borderRadius: 18,
    overflow: 'hidden',
  },
  ctaGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 18,
    borderRadius: 18,
  },
  ctaText: {
    fontSize: 15,
    fontWeight: '700',
  },
  // Mini trend
  trendRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  trendDay: {
    alignItems: 'center',
    gap: 4,
  },
  trendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  trendDotToday: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  trendLabel: {
    fontSize: 9,
    color: 'rgba(255,255,255,0.2)',
    fontWeight: '600',
  },
  trendLabelToday: {
    color: 'rgba(255,255,255,0.6)',
  },
});
