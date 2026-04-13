import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { formatLocalDate } from '@/utils/dateUtils';
import { useThemeColors } from '@/hooks/useThemeColors';
import { Typography, Spacing, BorderRadius } from '@/constants/theme';
import { Flame, Activity } from 'lucide-react-native';

interface HabitHeatmapProps {
  completedDays: string[];
  createdAt: number;
}

const DAYS_OF_WEEK = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function HabitHeatmap({ completedDays, createdAt }: HabitHeatmapProps) {
  const colors = useThemeColors();
  const weeks = 22;
  const today = new Date();
  
  // Calculate Streak
  const currentStreak = useMemo(() => {
    let streak = 0;
    const checkDate = new Date(today);
    const todayStr = formatLocalDate(checkDate);
    
    // If not done today, start checking from yesterday
    if (!completedDays.includes(todayStr)) {
      checkDate.setDate(checkDate.getDate() - 1);
    }

    for (let i = 0; i < 365; i++) {
      const dStr = formatLocalDate(checkDate);
      if (completedDays.includes(dStr)) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }
    return streak;
  }, [completedDays]);

  // Calculate Consistency % (Last 30 days)
  const consistency = useMemo(() => {
    let count = 0;
    for (let i = 0; i < 30; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      if (completedDays.includes(formatLocalDate(d))) count++;
    }
    return Math.round((count / 30) * 100);
  }, [completedDays]);

  // Calculate the start date (Monday of the starting week)
  const currentWeekMonday = new Date(today);
  const currentDayOfWeek = currentWeekMonday.getDay();
  const diffToMonday = currentDayOfWeek === 0 ? 6 : currentDayOfWeek - 1;
  currentWeekMonday.setDate(currentWeekMonday.getDate() - diffToMonday);
  
  const startDate = new Date(currentWeekMonday);
  startDate.setDate(currentWeekMonday.getDate() - ((weeks - 1) * 7));

  const renderGrid = () => {
    const grid = [];
    for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
      const row = [];
      for (let weekIndex = 0; weekIndex < weeks; weekIndex++) {
        const date = new Date(startDate);
        date.setDate(startDate.getDate() + (weekIndex * 7) + dayIndex);
        
        const dateStr = formatLocalDate(date);
        const isCompleted = completedDays.includes(dateStr);
        const isFuture = date > today;
        const isToday = dateStr === formatLocalDate(today);

        row.push(
          <View 
            key={`${weekIndex}-${dayIndex}`}
            style={[
              styles.cell,
              { backgroundColor: colors.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' },
              isCompleted && { 
                backgroundColor: colors.success,
              },
              isToday && { 
                borderColor: colors.success, 
                borderWidth: 1.5,
              },
              isFuture && styles.cellFuture,
            ]}
          />
        );
      }
      grid.push(
        <View key={dayIndex} style={styles.row}>
           {row}
        </View>
      );
    }
    return grid;
  };

  const renderMonthLabels = () => {
    const labels = [];
    let lastMonth = -1;
    
    for (let i = 0; i < weeks; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + (i * 7));
      const month = date.getMonth();
      
      if (month !== lastMonth) {
        labels.push(
          <Text key={i} style={[styles.monthLabel, { position: 'absolute', left: i * 14.5, color: colors.textSecondary }]}>
            {MONTHS[month]}
          </Text>
        );
        lastMonth = month;
      }
    }
    return labels;
  };

  return (
    <View style={styles.outerContainer}>
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

      <View style={styles.container}>
        <View style={styles.labelsContainer}>
          {DAYS_OF_WEEK.map((day, i) => (
            <Text key={i} style={[styles.dayLabel, { color: colors.textSecondary }]}>{day}</Text>
          ))}
        </View>
        <View style={styles.gridContainer}>
          <View style={styles.monthLabelsContainer}>
            {renderMonthLabels()}
          </View>
          <View style={styles.grid}>
            {renderGrid()}
          </View>
        </View>
      </View>
      
      <Text style={[styles.footerText, { color: colors.textSecondary }]}>
        Tracking since {new Date(createdAt).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}
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
  container: {
    flexDirection: 'row',
  },
  labelsContainer: {
    justifyContent: 'space-between',
    paddingTop: 24,
    paddingRight: 10,
    height: 126,
  },
  dayLabel: {
    fontSize: 10,
    fontWeight: '700',
    height: 12,
  },
  gridContainer: {
    flex: 1,
    overflow: 'hidden',
  },
  monthLabelsContainer: {
    flexDirection: 'row',
    height: 18,
    position: 'relative',
    marginBottom: 6,
  },
  monthLabel: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  grid: {
    gap: 4.5,
  },
  row: {
    flexDirection: 'row',
    gap: 4.5,
  },
  cell: {
    width: 10,
    height: 10,
    borderRadius: 3,
  },
  cellFuture: {
    opacity: 0.1,
  },
  footerText: {
    fontSize: 10,
    fontWeight: '500',
    textAlign: 'right',
    marginTop: 4,
    opacity: 0.6,
  }
});
