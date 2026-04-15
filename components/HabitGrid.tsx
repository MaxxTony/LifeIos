import { BorderRadius, Spacing } from '@/constants/theme';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useStore } from '@/store/useStore';
import { formatLocalDate, getTodayLocal } from '@/utils/dateUtils';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export function HabitGrid() {
  // Selectors: only re-render when habits, toggleHabit, or getStreak changes.
  const habits = useStore(s => s.habits);
  const toggleHabit = useStore(s => s.toggleHabit);
  const getStreak = useStore(s => s.getStreak);
  const colors = useThemeColors();
  const router = useRouter();

  const handleToggle = (id: string, dateStr?: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    toggleHabit(id, dateStr);
  };

  const getWeekDates = () => {
    const today = new Date();
    const day = today.getDay(); // 0 is Sunday, 1 is Monday...
    const diff = today.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(today);
    monday.setDate(diff);

    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      return formatLocalDate(d);
    });
  };

  const renderDots = (habitId: string, completedDays: string[]) => {
    const weekDates = getWeekDates();
    const today = getTodayLocal();

    return weekDates.map((dateString, i) => {
      const isCompleted = completedDays.includes(dateString);
      const isToday = dateString === today;
      const isFuture = dateString > today;

      return (
        <TouchableOpacity
          key={i}
          activeOpacity={0.6}
          hitSlop={{ top: 15, bottom: 15, left: 10, right: 10 }}
          onPress={() => {
            if (!isFuture) handleToggle(habitId, dateString);
          }}
          disabled={isFuture}
          style={[
            styles.dot,
            { backgroundColor: colors.isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' },
            isCompleted && [styles.dotCompleted, { backgroundColor: colors.success, shadowColor: colors.success }],
            isToday && [styles.dotToday, { borderColor: colors.textSecondary }],
            isFuture && { opacity: 0.3 }
          ]}
        >
          {isCompleted && <Ionicons name="checkmark" size={7} color="#FFF" />}
        </TouchableOpacity>
      );
    });
  };

  const getDayLabels = () => ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
  const streakColor = colors.secondary;

  return (
    <View style={[styles.container, { borderColor: colors.border }]}>
      <BlurView intensity={25} tint={colors.isDark ? "dark" : "light"} style={styles.blur}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>Habit Streaks</Text>
          <TouchableOpacity
            onPress={() => router.push('/(habits)/templates')}
            style={[styles.addBtn, { backgroundColor: colors.primaryTransparent, borderColor: colors.primaryMuted }]}
            accessibilityLabel="Add new habit"
            accessibilityRole="button"
          >
            <Ionicons name="add" size={20} color={colors.primary} />
          </TouchableOpacity>
        </View>

        {habits.length > 0 && (
          <View style={styles.dotsHeaderRow}>
            <View style={{ flex: 1 }} />
            <View style={styles.dotsHeaderLabels}>
              {getDayLabels().map((d, i) => (
                <Text key={i} style={[styles.dayLabelText, { color: colors.textSecondary }]}>{d[0]}</Text>
              ))}
            </View>
          </View>
        )}


        <View style={styles.habitList}>
          {habits.length > 0 ? habits.slice(0, 5).map((habit) => {
            const streak = getStreak(habit.id);
            const todayStr = getTodayLocal();
            const isCompletedToday = habit.completedDays.includes(todayStr);

            return (
              <View
                key={habit.id}
                style={[
                  styles.habitRow,
                  { backgroundColor: colors.isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.7)', borderColor: colors.border },
                  isCompletedToday && [styles.habitRowCompleted, { backgroundColor: colors.success + '08', borderColor: colors.success + '40' }]
                ]}
              >
                <TouchableOpacity
                  style={styles.habitMain}
                  onPress={() => router.push({ pathname: '/habit/[id]', params: { id: habit.id } })}
                  activeOpacity={0.6}
                >
                  <View style={styles.habitInfo}>
                    <Text style={[styles.habitTitle, { color: colors.text }, isCompletedToday && { color: colors.success }]} numberOfLines={1}>
                      {habit.icon} {habit.title}
                    </Text>
                    <View style={styles.streakInfo}>
                      <Ionicons name="flame" size={10} color={streak > 0 ? streakColor : colors.textSecondary + '40'} />
                      <Text style={[styles.habitStreak, { color: colors.textSecondary }, streak > 0 && { color: streakColor }]}>
                        {streak} day streak
                      </Text>
                    </View>
                  </View>

                  <View style={styles.dotsContainer}>
                    {renderDots(habit.id, habit.completedDays)}
                  </View>
                </TouchableOpacity>
              </View>
            );
          }) : (
            <TouchableOpacity
              onPress={() => router.push('/(habits)/templates')}
              style={[styles.emptyContainer, { backgroundColor: colors.isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)', borderColor: colors.border }]}
              accessibilityLabel="Add habits to track streaks"
              accessibilityRole="button"
            >
              <Ionicons name="sparkles-outline" size={20} color={colors.textSecondary + '40'} style={{ marginBottom: 8 }} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Add habits to track streaks +</Text>
            </TouchableOpacity>
          )}
        </View>

        {habits.length > 5 && (
          <TouchableOpacity
            onPress={() => router.push('/all-habits')}
            style={[styles.viewMore, { borderTopColor: colors.border }]}
            accessibilityLabel={`View all ${habits.length} habits`}
            accessibilityRole="button"
          >
            <Text style={[styles.viewMoreText, { color: colors.primary }]}>
              +{habits.length - 5} more habits
            </Text>
          </TouchableOpacity>
        )}
      </BlurView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    minHeight: 180,
  },
  blur: {
    flex: 1,
    padding: Spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontFamily: 'Outfit-Bold',
    fontSize: 13,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  addBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  dotsHeaderRow: {
    flexDirection: 'row',
    marginBottom: 8,
    paddingHorizontal: 12,
  },
  dotsHeaderLabels: {
    flexDirection: 'row',
    width: 150, // Increased for more space
    justifyContent: 'space-between',
    paddingRight: 4,
  },
  dayLabelText: {
    fontSize: 9,
    width: 16,
    textAlign: 'center',
    fontWeight: '800',
    opacity: 0.6,
  },
  habitList: {
    gap: 10,
  },
  habitRow: {
    padding: 12,
    borderRadius: 20,
    borderWidth: 1,
  },
  habitRowCompleted: {
  },
  habitMain: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  habitInfo: {
    flex: 1,
    marginRight: 12,
  },
  habitTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  streakInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  habitStreak: {
    fontSize: 10,
    fontWeight: '600',
  },
  dotsContainer: {
    flexDirection: 'row',
    width: 150, // Matches header labels exactly
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingRight: 4,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 3.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dotCompleted: {
    shadowRadius: 4,
    shadowOpacity: 0.5,
    elevation: 3,
  },
  dotToday: {
    borderWidth: 1,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 35,
    borderStyle: 'dashed',
    borderWidth: 1,
    borderRadius: 16,
  },
  emptyText: {
    fontSize: 12,
    fontWeight: '600',
  },
  viewMore: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    alignItems: 'center',
  },
  viewMoreText: {
    fontSize: 12,
    fontWeight: '700',
  },
});
