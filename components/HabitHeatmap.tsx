import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { formatLocalDate } from '@/utils/dateUtils';

interface HabitHeatmapProps {
  completedDays: string[];
  createdAt: number;
}

const DAYS_OF_WEEK = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function HabitHeatmap({ completedDays, createdAt }: HabitHeatmapProps) {
  // We'll show the last 24 weeks (roughly 6 months)
  const weeks = 22;
  const today = new Date();
  
  // Calculate the start date (Monday of the week 22 weeks ago)
  const startDate = new Date();
  startDate.setDate(today.getDate() - (weeks * 7));
  // Adjust to the nearest Monday
  const dayOfWeek = startDate.getDay(); // 0 is Sunday, 1 is Monday
  const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  startDate.setDate(startDate.getDate() - diff);

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
              isCompleted && styles.cellCompleted,
              isFuture && styles.cellFuture,
              isToday && styles.cellToday
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
        <Text key={i} style={[styles.monthLabel, { left: i * 14 }]}>
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
          <Text key={i} style={styles.dayLabel}>{day}</Text>
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
    color: 'rgba(255,255,255,0.3)',
    fontWeight: '600',
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
    color: 'rgba(255,255,255,0.3)',
    fontWeight: '600',
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
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  cellCompleted: {
    backgroundColor: '#00D68F',
    shadowColor: '#00D68F',
    shadowRadius: 4,
    shadowOpacity: 0.5,
  },
  cellToday: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  cellFuture: {
    opacity: 0.2,
  }
});
