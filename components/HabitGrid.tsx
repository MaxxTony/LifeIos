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
            isCompleted && styles.dotCompleted,
            isToday && styles.dotToday
          ]}
        />
      );
    }
    return dots;
  };

  // FIX M-6: Derive day labels dynamically from the last 7 calendar days
  // Previously hardcoded ['M','T','W','T','F','S','S'] which misaligned with actual dot dates
  const getDayLabels = () => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return ['S', 'M', 'T', 'W', 'T', 'F', 'S'][d.getDay()];
    });
  };

  return (
    <View style={styles.container}>
      <BlurView intensity={25} tint="dark" style={styles.blur}>
        <View style={styles.header}>
          <View style={styles.titleGroup}>
            <Text style={styles.title}>Habit Streaks</Text>
            <View style={styles.dayLabels}>
              {/* FIX M-6: Labels now match actual calendar days shown in dots */}
              {getDayLabels().map((d, i) => (
                <Text key={i} style={styles.dayLabelText}>{d}</Text>
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
              <View key={habit.id} style={[styles.habitRow, isCompletedToday && styles.habitRowCompleted]}>
                <TouchableOpacity
                  style={styles.habitInfo}
                  onPress={() => router.push({ pathname: '/habit/[id]', params: { id: habit.id } })}
                  activeOpacity={0.6}
                  accessibilityLabel={`View ${habit.title} habit details`}
                  accessibilityRole="button"
                >
                  <Text style={[styles.habitTitle, isCompletedToday && styles.completedTitle]} numberOfLines={1}>
                    {habit.icon} {habit.title}
                  </Text>
                  <View style={styles.streakInfo}>
                    <Ionicons name="flame" size={10} color={streak > 0 ? '#FF8C42' : 'rgba(255,255,255,0.2)'} />
                    <Text style={[styles.habitStreak, streak > 0 && styles.activeStreak]}>
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
              style={styles.emptyContainer}
              accessibilityLabel="Add habits to track streaks"
              accessibilityRole="button"
            >
              <Ionicons name="sparkles-outline" size={20} color="rgba(255,255,255,0.2)" style={{ marginBottom: 8 }} />
              <Text style={styles.emptyText}>Add habits to track streaks +</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* FIX M-13: Show overflow indicator when more than 3 habits exist */}
        {habits.length > 3 && (
          <TouchableOpacity
            onPress={() => router.push('/(tabs)/progress')}
            style={styles.viewMore}
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
    borderColor: 'rgba(255,255,255,0.06)',
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
    color: 'rgba(255,255,255,0.4)',
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  addBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: -2,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  dayLabels: {
    flexDirection: 'row',
    gap: 4,
    paddingLeft: 2,
  },
  dayLabelText: {
    fontSize: 7,
    color: 'rgba(255,255,255,0.2)',
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
    backgroundColor: 'rgba(255,255,255,0.03)',
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
  },
  habitRowCompleted: {
    backgroundColor: 'rgba(0, 214, 143, 0.05)',
    borderColor: 'rgba(0, 214, 143, 0.15)',
  },
  habitInfo: {
    flex: 1,
  },
  habitTitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '700',
    marginBottom: 3,
  },
  completedTitle: {
    color: '#00D68F',
  },
  streakInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  habitStreak: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.3)',
    fontWeight: '600',
  },
  activeStreak: {
    color: '#FF8C42',
  },
  dotsContainer: {
    flexDirection: 'row',
    gap: 5,
    alignItems: 'center',
    paddingLeft: 10,
    height: '100%',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  dotCompleted: {
    backgroundColor: '#00D68F',
    shadowColor: '#00D68F',
    shadowRadius: 4,
    shadowOpacity: 0.5,
    elevation: 3,
  },
  dotToday: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 35,
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  emptyText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.3)',
    fontWeight: '600',
  },
  // FIX M-13: Style for "view all habits" overflow link
  viewMore: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
  },
  viewMoreText: {
    fontSize: 12,
    fontWeight: '700',
  },
});
