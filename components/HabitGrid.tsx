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

interface HabitItemProps {
  habit: any;
  streak: number;
  isCompletedToday: boolean;
  isSyncing: boolean;
  colors: any;
  onToggle: (id: string, dateStr: string) => void;
}

const HabitItem = React.memo(({ habit, streak, isCompletedToday, isSyncing, colors, onToggle }: HabitItemProps) => {
  const router = useRouter();
  const streakColor = colors.secondary;

  const renderDots = () => {
    const today = getTodayLocal();
    const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    
    // Calculate week dates locally to keep them stable
    const todayObj = new Date();
    const day = todayObj.getDay();
    const diff = todayObj.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(todayObj);
    monday.setDate(diff);

    const weekDates = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      return formatLocalDate(d);
    });

    return weekDates.map((dateString, i) => {
      const isCompleted = habit.completedDays.includes(dateString);
      const isToday = dateString === today;
      const isFuture = dateString > today;
      const dayName = dayNames[i];

      return (
        <TouchableOpacity
          key={i}
          activeOpacity={0.6}
          hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
          onPress={() => {
            if (!isFuture) onToggle(habit.id, dateString);
          }}
          disabled={isFuture}
          style={[
            styles.dot,
            { backgroundColor: colors.isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' },
            isCompleted && [styles.dotCompleted, { backgroundColor: colors.success, shadowColor: colors.success }],
            isToday && [styles.dotToday, { borderColor: colors.textSecondary }],
            isFuture && { opacity: 0.3 }
          ]}
          accessibilityLabel={`${dayName} for ${habit.title}: ${isCompleted ? 'Completed' : 'Not completed'}${isToday ? ' (Today)' : ''}`}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: isCompleted, disabled: isFuture }}
        >
          {isCompleted && <Ionicons name="checkmark" size={7} color="#FFF" />}
        </TouchableOpacity>
      );
    });
  };

  return (
    <View
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
        accessibilityLabel={`View details for ${habit.title}`}
        accessibilityRole="button"
      >
        <View style={styles.habitInfo}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={[styles.habitTitle, { color: colors.text }, isCompletedToday && { color: colors.success }]} numberOfLines={1}>
              {habit.icon} {habit.title}
            </Text>
            {isSyncing && (
              <Ionicons name="cloud-upload-outline" size={12} color={colors.primaryMuted} />
            )}
          </View>
          <View style={styles.streakInfo}>
            <Ionicons name="flame" size={10} color={streak > 0 ? streakColor : colors.textSecondary + '40'} />
            <Text style={[styles.habitStreak, { color: colors.textSecondary }, streak > 0 && { color: streakColor }]}>
              {streak} day streak
            </Text>
          </View>
        </View>

        <View style={styles.dotsContainer}>
          {renderDots()}
        </View>
      </TouchableOpacity>
    </View>
  );
});

export const HabitGrid = React.memo(function HabitGrid() {
  const habits = useStore(s => s.habits);
  const toggleHabit = useStore(s => s.actions.toggleHabit);
  const getStreak = useStore(s => s.actions.getStreak);
  const pendingActions = useStore(s => s.pendingActions);
  const colors = useThemeColors();
  const router = useRouter();

  // FIX P-4: Use useRef for stable callback
  const habitsRef = React.useRef(habits);
  React.useEffect(() => {
    habitsRef.current = habits;
  }, [habits]);

  const handleToggle = React.useCallback((id: string, dateStr: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    toggleHabit(id, dateStr);
  }, [toggleHabit]);

  const getDayLabels = () => ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

  return (
    <View style={[styles.container, { borderColor: colors.border }]}>
      <BlurView intensity={25} tint={colors.isDark ? "dark" : "light"} style={styles.blur}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>Habit Streaks</Text>
          <TouchableOpacity
            onPress={() => router.push('/(habits)/templates')}
            style={[styles.addBtn, { backgroundColor: colors.primaryTransparent, borderColor: colors.primaryMuted }]}
            accessibilityLabel="Create or choose habit template"
            accessibilityRole="button"
            accessibilityHint="Navigates to the habit templates screen"
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
            const isSyncing = pendingActions.some(a => a.id === habit.id);

            return (
              <HabitItem
                key={habit.id}
                habit={habit}
                streak={streak}
                isCompletedToday={isCompletedToday}
                isSyncing={isSyncing}
                colors={colors}
                onToggle={handleToggle}
              />
            );
          }) : (
            <TouchableOpacity
              onPress={() => router.push('/(habits)/templates')}
              style={[styles.emptyContainer, { backgroundColor: colors.isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)', borderColor: colors.border }]}
              accessibilityLabel="Add habits to track streaks"
              accessibilityRole="button"
            >
              <Ionicons name="sparkles-outline" size={20} color={colors.textSecondary + '40'} style={{ marginBottom: Spacing.sm }} />
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
});

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
    marginBottom: Spacing.md,
  },
  title: {
    fontFamily: 'Outfit-Bold',
    fontSize: 13,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  addBtn: {
    width: 44, // WCAG Standard
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  dotsHeaderRow: {
    flexDirection: 'row',
    marginBottom: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  dotsHeaderLabels: {
    flexDirection: 'row',
    width: 180, // High-fidelity width for spacing
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
    gap: Spacing.sm,
  },
  habitRow: {
    padding: Spacing.sm,
    paddingHorizontal: Spacing.md,
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
    marginRight: Spacing.md,
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
    width: 180, 
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingRight: 4,
  },
  dot: {
    width: 14, 
    height: 14,
    borderRadius: 5,
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
    paddingVertical: Spacing.xl,
    borderStyle: 'dashed',
    borderWidth: 1,
    borderRadius: 16,
  },
  emptyText: {
    fontSize: 12,
    fontWeight: '600',
  },
  viewMore: {
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    alignItems: 'center',
  },
  viewMoreText: {
    fontSize: 12,
    fontWeight: '700',
  },
});
