import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { BlurView } from 'expo-blur';
import { Typography, Spacing, BorderRadius } from '@/constants/theme';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useStore } from '@/store/useStore';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { getTodayLocal, formatLocalDate } from '@/utils/dateUtils';
import { useRouter } from 'expo-router';

export function HabitGrid() {
  const { habits, toggleHabit, getStreak } = useStore();
  const colors = useThemeColors();
  const router = useRouter();

  const handleToggle = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    toggleHabit(id);
  };

  const renderDots = (completedDays: string[]) => {
    const dots = [];
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      const dateString = formatLocalDate(date);
      const isCompleted = completedDays.includes(dateString);
      const isToday = i === 0;

      dots.push(
        <View
          key={i}
          style={[
            styles.dot,
            { backgroundColor: colors.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' },
            isCompleted && [styles.dotCompleted, { backgroundColor: colors.success, shadowColor: colors.success }],
            isToday && [styles.dotToday, { borderColor: colors.textSecondary + '60' }]
          ]}
        >
          {isCompleted && <Ionicons name="checkmark" size={7} color="#FFF" />}
        </View>
      );
    }
    return dots;
  };

  const getDayLabels = () => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return ['S', 'M', 'T', 'W', 'T', 'F', 'S'][d.getDay()];
    });
  };

  const streakColor = colors.isDark ? '#FF8C42' : '#EA580C';

  return (
    <View style={[styles.container, { borderColor: colors.border }]}>
      <BlurView intensity={25} tint={colors.isDark ? "dark" : "light"} style={styles.blur}>
        <View style={styles.header}>
          <View style={styles.titleGroup}>
            <Text style={[styles.title, { color: colors.textSecondary }]}>Habit Streaks</Text>
            <View style={styles.dayLabels}>
              {getDayLabels().map((d, i) => (
                <Text key={i} style={[styles.dayLabelText, { color: colors.textSecondary + '60' }]}>{d}</Text>
              ))}
            </View>
          </View>
          <TouchableOpacity
            onPress={() => router.push('/(habits)/templates')}
            style={[styles.addBtn, { backgroundColor: colors.primaryTransparent, borderColor: colors.primaryMuted }]}
            accessibilityLabel="Add new habit"
            accessibilityRole="button"
          >
            <Ionicons name="add" size={20} color={colors.primary} />
          </TouchableOpacity>
        </View>

        <View style={styles.habitList}>
          {habits.length > 0 ? habits.slice(0, 3).map((habit) => {
            const streak = getStreak(habit.id);
            const todayStr = getTodayLocal();
            const isCompletedToday = habit.completedDays.includes(todayStr);

            return (
              <View 
                key={habit.id} 
                style={[
                  styles.habitRow, 
                  { backgroundColor: colors.isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)', borderColor: colors.border },
                  isCompletedToday && [styles.habitRowCompleted, { backgroundColor: colors.success + '10', borderColor: colors.success + '30' }]
                ]}
              >
                <TouchableOpacity
                  style={styles.habitInfo}
                  onPress={() => router.push({ pathname: '/habit/[id]', params: { id: habit.id } })}
                  activeOpacity={0.6}
                  accessibilityLabel={`View ${habit.title} habit details`}
                  accessibilityRole="button"
                >
                  <Text style={[styles.habitTitle, { color: colors.text }, isCompletedToday && { color: colors.success }]} numberOfLines={1}>
                    {habit.icon} {habit.title}
                  </Text>
                  <View style={styles.streakInfo}>
                    <Ionicons name="flame" size={10} color={streak > 0 ? streakColor : colors.textSecondary + '40'} />
                    <Text style={[styles.habitStreak, { color: colors.textSecondary }, streak > 0 && { color: streakColor }]}>
                      {streak} day streak
                    </Text>
                  </View>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.dotsContainer}
                  onPress={() => handleToggle(habit.id)}
                  activeOpacity={0.7}
                  accessibilityLabel={isCompletedToday ? `Mark ${habit.title} as incomplete` : `Complete ${habit.title}`}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: isCompletedToday }}
                >
                  {renderDots(habit.completedDays)}
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

        {habits.length > 3 && (
          <TouchableOpacity
            onPress={() => router.push('/(tabs)/progress')}
            style={[styles.viewMore, { borderTopColor: colors.border }]}
            accessibilityLabel={`View all ${habits.length} habits`}
            accessibilityRole="button"
          >
            <Text style={[styles.viewMoreText, { color: colors.primary }]}>
              +{habits.length - 3} more habits
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
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  titleGroup: {
    gap: 6,
  },
  title: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  addBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: -2,
    borderWidth: 1,
  },
  dayLabels: {
    flexDirection: 'row',
    gap: 4,
    paddingLeft: 2,
  },
  dayLabelText: {
    fontSize: 7,
    width: 8,
    textAlign: 'center',
    fontWeight: '700',
  },
  habitList: {
    gap: 12,
  },
  habitRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
  },
  habitRowCompleted: {
  },
  habitInfo: {
    flex: 1,
  },
  habitTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 3,
  },
  streakInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  habitStreak: {
    fontSize: 10,
    fontWeight: '600',
  },
  dotsContainer: {
    flexDirection: 'row',
    gap: 5,
    alignItems: 'center',
    paddingLeft: 10,
    height: '100%',
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
