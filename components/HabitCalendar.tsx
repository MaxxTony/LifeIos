import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { formatLocalDate, getTodayLocal } from '@/utils/dateUtils';
import { useThemeColors } from '@/hooks/useThemeColors';
import { Typography, Spacing, BorderRadius } from '@/constants/theme';
import { Flame, Activity, ChevronLeft, ChevronRight } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

interface HabitCalendarProps {
  completedDays: string[];
  createdAt: number;
}

const DAYS_OF_WEEK = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export function HabitCalendar({ completedDays, createdAt }: HabitCalendarProps) {
  const colors = useThemeColors();
  const today = new Date();
  const [viewDate, setViewDate] = useState(new Date());

  // Navigation Logic
  const handlePrevMonth = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
  };

  const handleResetToToday = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setViewDate(new Date());
  };

  // Streak & Consistency Metrics (Preserved from Heatmap logic)
  const currentStreak = useMemo(() => {
    let streak = 0;
    const checkDate = new Date(today);
    const todayStr = formatLocalDate(checkDate);
    if (!completedDays.includes(todayStr)) checkDate.setDate(checkDate.getDate() - 1);

    for (let i = 0; i < 365; i++) {
        const dStr = formatLocalDate(checkDate);
        if (completedDays.includes(dStr)) { streak++; checkDate.setDate(checkDate.getDate() - 1); }
        else break;
    }
    return streak;
  }, [completedDays]);

  const consistency = useMemo(() => {
    let count = 0;
    for (let i = 0; i < 30; i++) {
      const d = new Date(today); d.setDate(d.getDate() - i);
      if (completedDays.includes(formatLocalDate(d))) count++;
    }
    return Math.round((count / 30) * 100);
  }, [completedDays]);

  // Calendar Grid Logic
  const calendarDays = useMemo(() => {
    const startOfMonth = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
    const endOfMonth = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0);
    
    // Find the Monday of the first week
    const firstDayIndex = startOfMonth.getDay(); // 0 is Sunday
    const diffToMonday = firstDayIndex === 0 ? 6 : firstDayIndex - 1;
    const startDate = new Date(startOfMonth);
    startDate.setDate(startOfMonth.getDate() - diffToMonday);

    const days = [];
    for (let i = 0; i < 42; i++) { // 6 weeks
      const d = new Date(startDate);
      d.setDate(startDate.getDate() + i);
      days.push({
        date: d,
        dateStr: formatLocalDate(d),
        isCurrentMonth: d.getMonth() === viewDate.getMonth(),
        isToday: formatLocalDate(d) === getTodayLocal(),
        isCompleted: completedDays.includes(formatLocalDate(d)),
        isFuture: d > today,
      });
    }
    return days;
  }, [viewDate, completedDays]);

  return (
    <View style={styles.outerContainer}>
      {/* Metrics Row */}
      <View style={styles.statsRow}>
        <View style={[styles.statChip, { backgroundColor: colors.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}>
          <Flame size={14} color={colors.danger} fill={currentStreak > 0 ? colors.danger : 'transparent'} />
          <Text style={[styles.statText, { color: colors.text }]}>{currentStreak} Day Streak</Text>
        </View>
        <View style={[styles.statChip, { backgroundColor: colors.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}>
          <Activity size={14} color={colors.primary} />
          <Text style={[styles.statText, { color: colors.text }]}>{consistency}% Consistency</Text>
        </View>
      </View>

      {/* Calendar Header */}
      <View style={styles.calendarHeader}>
        <View>
          <Text style={[styles.monthYear, { color: colors.text }]}>{MONTHS[viewDate.getMonth()]} {viewDate.getFullYear()}</Text>
          {viewDate.getMonth() !== today.getMonth() || viewDate.getFullYear() !== today.getFullYear() ? (
            <TouchableOpacity onPress={handleResetToToday}>
              <Text style={[styles.resetText, { color: colors.primary }]}>Back to Today</Text>
            </TouchableOpacity>
          ) : null}
        </View>
        <View style={styles.navButtons}>
          <TouchableOpacity style={[styles.navBtn, { borderColor: colors.border }]} onPress={handlePrevMonth}>
            <ChevronLeft size={20} color={colors.text} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.navBtn, { borderColor: colors.border }]} onPress={handleNextMonth}>
            <ChevronRight size={20} color={colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Week Headers */}
      <View style={styles.weekHeaders}>
        {DAYS_OF_WEEK.map((day, i) => (
          <Text key={i} style={[styles.weekLabel, { color: colors.textSecondary }]}>{day}</Text>
        ))}
      </View>

      {/* Grid */}
      <View style={styles.grid}>
        {calendarDays.map((day, i) => (
          <View key={i} style={styles.dayCellContainer}>
            <View 
              style={[
                styles.dayCell,
                { backgroundColor: colors.isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)' },
                day.isCompleted && { backgroundColor: colors.success, shadowColor: colors.success, shadowOpacity: 0.3, shadowRadius: 5, elevation: 3 },
                day.isToday && { borderColor: colors.primary, borderWidth: 1.5 },
                !day.isCurrentMonth && { opacity: 0.2 },
                day.isFuture && { opacity: 0.1 }
              ]}
            >
              <Text style={[
                styles.dayText, 
                { color: day.isCompleted ? '#fff' : (day.isCurrentMonth ? colors.text : colors.textSecondary) },
                day.isToday && !day.isCompleted && { color: colors.primary, fontWeight: '800' }
              ]}>
                {day.date.getDate()}
              </Text>
            </View>
          </View>
        ))}
      </View>

      <Text style={[styles.footerText, { color: colors.textSecondary }]}>
        Started in {new Date(createdAt).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    gap: Spacing.md,
  },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: 4,
  },
  statChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: BorderRadius.md,
  },
  statText: {
    fontSize: 12,
    fontWeight: '700',
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  monthYear: {
    fontSize: 18,
    fontFamily: 'Outfit-Bold',
    fontWeight: '700',
  },
  resetText: {
    fontSize: 10,
    fontWeight: '700',
    marginTop: 2,
    textTransform: 'uppercase',
  },
  navButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  navBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  weekHeaders: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  weekLabel: {
    width: 36,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '800',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    justifyContent: 'space-between',
  },
  dayCellContainer: {
    width: '13%', // Approx 7 columns
    aspectRatio: 1,
    marginBottom: 4,
  },
  dayCell: {
    flex: 1,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayText: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'Inter-Medium',
  },
  footerText: {
    fontSize: 10,
    fontWeight: '500',
    textAlign: 'center',
    marginTop: 8,
    opacity: 0.6,
  }
});
