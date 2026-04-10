import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import { BlurView } from 'expo-blur';
import { Colors, Typography, Spacing, BorderRadius } from '@/constants/theme';
import { useStore } from '@/store/useStore';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { getTodayLocal, formatLocalDate } from '@/utils/dateUtils';

export function HabitGrid() {
  const { habits, toggleHabit, getStreak, addHabit } = useStore();
  const [showAdd, setShowAdd] = useState(false);
  const [newTitle, setNewTitle] = useState('');

  const handleToggle = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    toggleHabit(id);
  };

  const handleAdd = () => {
    if (newTitle.trim()) {
      addHabit(newTitle.trim());
      setNewTitle('');
      setShowAdd(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  const renderDots = (completedDays: string[]) => {
    const dots = [];
    const today = new Date();
    for (let i = 6; i >= 0; i--) { 
      const date = new Date();
      date.setDate(today.getDate() - i);
      const dateString = formatLocalDate(date);
      const isCompleted = completedDays.includes(dateString);
      
      dots.push(
        <View 
          key={i} 
          style={[
            styles.dot, 
            isCompleted && styles.dotCompleted,
            i === 0 && styles.dotToday
          ]} 
        />
      );
    }
    return dots;
  };

  return (
    <View style={styles.container}>
      <BlurView intensity={30} tint="dark" style={styles.blur}>
        <View style={styles.header}>
          <View style={styles.titleGroup}>
            <Text style={styles.title}>Habit Streaks</Text>
            <View style={styles.dayLabels}>
              {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
                <Text key={i} style={styles.dayLabelText}>{d}</Text>
              ))}
            </View>
          </View>
          <TouchableOpacity onPress={() => setShowAdd(!showAdd)} style={styles.addBtn}>
            <Ionicons name="add" size={18} color="rgba(255,255,255,0.6)" />
          </TouchableOpacity>
        </View>

        {showAdd && (
          <View style={styles.addInputRow}>
            <TextInput
              style={styles.input}
              placeholder="Habit name..."
              placeholderTextColor="rgba(255,255,255,0.3)"
              value={newTitle}
              onChangeText={setNewTitle}
              autoFocus
              onSubmitEditing={handleAdd}
            />
            <TouchableOpacity onPress={handleAdd} style={styles.saveBtn}>
               <Ionicons name="checkmark-circle" size={20} color="#7C5CFF" />
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.habitList}>
          {habits.length > 0 ? habits.slice(0, 3).map((habit) => {
            const streak = getStreak(habit.id);
            const todayStr = getTodayLocal();
            const isCompletedToday = habit.completedDays.includes(todayStr);

            return (
              <TouchableOpacity 
                key={habit.id} 
                style={[styles.habitRow, isCompletedToday && styles.habitRowCompleted]}
                onPress={() => handleToggle(habit.id)}
                activeOpacity={0.7}
              >
                <View style={styles.habitInfo}>
                  <Text style={[styles.habitTitle, isCompletedToday && styles.completedTitle]} numberOfLines={1}>
                    {habit.title}
                  </Text>
                  <View style={styles.streakInfo}>
                    <Ionicons name="flame" size={10} color={streak > 0 ? '#FF8C42' : 'rgba(255,255,255,0.2)'} />
                    <Text style={[styles.habitStreak, streak > 0 && styles.activeStreak]}>
                      {streak} day streak
                    </Text>
                  </View>
                </View>
                <View style={styles.dotsContainer}>
                  {renderDots(habit.completedDays)}
                </View>
              </TouchableOpacity>
            );
          }) : !showAdd && (
            <TouchableOpacity onPress={() => setShowAdd(true)} style={styles.emptyContainer}>
               <Text style={styles.emptyText}>Add habits to track streaks +</Text>
            </TouchableOpacity>
          )}
        </View>
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
    borderColor: 'rgba(255,255,255,0.08)',
    height: 180,
  },
  blur: {
    flex: 1,
    padding: Spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  titleGroup: {
    gap: 4,
  },
  title: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  addBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: -2,
  },
  dayLabels: {
    flexDirection: 'row',
    gap: 4,
    paddingLeft: 2,
  },
  dayLabelText: {
    fontSize: 7,
    color: 'rgba(255,255,255,0.25)',
    width: 8,
    textAlign: 'center',
    fontWeight: '600',
  },
  addInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(124, 92, 255, 0.1)',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(124, 92, 255, 0.2)',
  },
  input: {
    flex: 1,
    color: '#FFF',
    fontSize: 13,
    padding: 0,
  },
  saveBtn: {
    padding: 4,
  },
  habitList: {
    gap: 10,
  },
  habitRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.02)',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  habitRowCompleted: {
    backgroundColor: 'rgba(0, 214, 143, 0.03)',
    borderColor: 'rgba(0, 214, 143, 0.1)',
  },
  habitInfo: {
    flex: 1,
  },
  habitTitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '600',
    marginBottom: 2,
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
    fontWeight: '500',
  },
  activeStreak: {
    color: '#FF8C42',
  },
  dotsContainer: {
    flexDirection: 'row',
    gap: 4,
    alignItems: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 2.5,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  dotCompleted: {
    backgroundColor: '#00D68F',
    shadowColor: '#00D68F',
    shadowRadius: 4,
    elevation: 3,
  },
  dotToday: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
  },
  emptyText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.3)',
    fontWeight: '500',
  }
});
