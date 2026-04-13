import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { formatLocalDate } from '@/utils/dateUtils';
import { useThemeColors } from '@/hooks/useThemeColors';
import { Typography } from '@/constants/theme';

interface HabitHeatmapProps {
  completedDays: string[];
  createdAt: number;
}

const DAYS_OF_WEEK = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function HabitHeatmap({ completedDays, createdAt }: HabitHeatmapProps) {
  const colors = useThemeColors();
  // We'll show the last 24 weeks (roughly 6 months)
  const weeks = 22;
  const today = new Date();
  
  // Calculate the start date (Monday of the starting week)
  // Ensure the current week is the last column (index 21)
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
                shadowColor: colors.success,
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.5,
                shadowRadius: 4,
                elevation: 2
              },
              isToday && { 
                borderColor: colors.success, 
                borderWidth: 1.5,
                backgroundColor: isCompleted ? colors.success : (colors.isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.06)')
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
    for (let i = 0; i < weeks; i += 4) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + (i * 7));
      labels.push(
        <Text key={i} style={[styles.monthLabel, { left: i * 14, color: colors.textSecondary }]}>
          {MONTHS[date.getMonth()]}
        </Text>
      );
    }
    return labels;
  };

  return (
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
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    paddingVertical: 10,
  },
  labelsContainer: {
    justifyContent: 'space-between',
    paddingTop: 22,
    paddingRight: 8,
    height: 110,
  },
  dayLabel: {
    fontSize: 9,
    fontWeight: '700',
    height: 10,
  },
  gridContainer: {
    flex: 1,
  },
  monthLabelsContainer: {
    flexDirection: 'row',
    height: 20,
    position: 'relative',
  },
  monthLabel: {
    position: 'absolute',
    fontSize: 10,
    fontWeight: '700',
  },
  grid: {
    gap: 4,
  },
  row: {
    flexDirection: 'row',
    gap: 4,
  },
  cell: {
    width: 10,
    height: 10,
    borderRadius: 2,
  },
  cellFuture: {
    opacity: 0.2,
  }
});
