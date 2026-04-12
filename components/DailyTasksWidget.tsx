import { Spacing, Typography } from '@/constants/theme';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useStore } from '@/store/useStore';
import { getTodayLocal } from '@/utils/dateUtils';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { BlurView } from 'expo-blur';
import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export function DailyTasksWidget() {
  const router = useRouter();
  const colors = useThemeColors();
  const { tasks, toggleTask } = useStore();

  const today = getTodayLocal();

  const priorityWeight = { high: 1, medium: 2, low: 3 };

  const todayTasks = tasks
    .filter(t => t.date === today)
    .sort((a, b) => {
      if (priorityWeight[a.priority] !== priorityWeight[b.priority]) {
        return priorityWeight[a.priority] - priorityWeight[b.priority];
      }
      return (a.dueTime || 0) - (b.dueTime || 0);
    });

  const priorityColors = {
    high: '#FF4B4B',
    medium: '#FFB347',
    low: '#00D68F'
  };

  return (
    <View style={styles.container}>
      <BlurView intensity={20} tint="dark" style={styles.blur}>
        <View style={styles.header}>
          <Text style={styles.title}>Daily Tasks</Text>
          <TouchableOpacity
            onPress={() => router.push('/tasks/create')}
            style={[styles.addBtn, { backgroundColor: colors.primaryTransparent, borderColor: colors.primaryMuted }]}
            accessibilityLabel="Add new task"
            accessibilityRole="button"
          >
            <Ionicons name="add" size={20} color={colors.primary} />
          </TouchableOpacity>
        </View>

        <View style={styles.list}>
          {todayTasks.length > 0 ? todayTasks.map((task) => (
            // FIX M-5: Restructured from nested TouchableOpacity to sibling layout
            // Nested touchables caused checkbox taps to fire row navigation on Android
            <View
              key={task.id}
              style={[styles.taskItem, task.completed && styles.taskCompleted]}
            >
              <TouchableOpacity
                style={[
                  styles.checkbox,
                  { borderColor: priorityColors[task.priority] },
                  task.completed && styles.checkboxChecked
                ]}
                onPress={() => {
                  if (!task.completed) {
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                    toggleTask(task.id);
                  } else {
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                  }
                }}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                accessibilityLabel={task.completed ? `${task.text}, completed` : `Mark ${task.text} as complete`}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: task.completed }}
              >
                {task.completed && (
                  <View style={[styles.innerCheck, { backgroundColor: priorityColors[task.priority] }]} />
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.taskInfoRow}
                onPress={() => router.push(`/tasks/${task.id}`)}
                activeOpacity={0.7}
                accessibilityLabel={`View details for ${task.text}`}
                accessibilityRole="button"
              >
                <View style={styles.taskInfo}>
                  <Text style={[styles.taskText, task.completed && styles.taskTextCompleted]} numberOfLines={1}>
                    {task.text}
                  </Text>
                  <View style={styles.taskMeta}>
                    <View style={styles.metaItem}>
                      <Ionicons name="flag" size={10} color={priorityColors[task.priority]} />
                      <Text style={[styles.metaText, { color: priorityColors[task.priority || 'medium'] }]}>
                        {(task.priority || 'medium').toUpperCase()}
                      </Text>
                    </View>
                    {task.startTime && (
                      <View style={styles.metaItem}>
                        <Ionicons name="time-outline" size={10} color="rgba(255,255,255,0.6)" />
                        <Text style={styles.metaText}>{task.startTime}</Text>
                      </View>
                    )}
                    {task.status === 'missed' && (
                      <Text style={styles.missedTag}>Missed</Text>
                    )}
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.2)" />
              </TouchableOpacity>
            </View>
          )) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No tasks for today. Start fresh? ✨</Text>
            </View>
          )}
        </View>

      </BlurView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    marginBottom: Spacing.md,
  },
  blur: {
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    ...Typography.labelSmall,
    fontSize: 14,
    color: '#FFF',
    letterSpacing: 1.5,
  },
  addBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(124, 92, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(124, 92, 255, 0.3)',
  },
  list: {
    gap: 12,
  },
  // FIX M-5: taskItem is now a View, not TouchableOpacity
  taskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  taskCompleted: {
    opacity: 0.5,
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    marginRight: 16,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  checkboxChecked: {
    borderColor: 'transparent',
  },
  innerCheck: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  // FIX M-5: New style for the navigable right-side portion
  taskInfoRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  taskInfo: {
    flex: 1,
  },
  taskText: {
    fontSize: 15,
    color: '#FFF',
    fontWeight: '600',
    marginBottom: 4,
  },
  taskTextCompleted: {
    textDecorationLine: 'line-through',
    color: 'rgba(255,255,255,0.3)',
  },
  taskMeta: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.04)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  metaText: {
    ...Typography.labelSmall,
    color: 'rgba(255,255,255,0.8)',
    fontSize: 9,
  },
  missedTag: {
    ...Typography.labelSmall,
    fontSize: 8,
    color: '#FF4B4B',
    backgroundColor: 'rgba(255, 75, 75, 0.1)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  emptyState: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.3)',
    fontWeight: '500',
  },
  viewMore: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
  },
  viewMoreText: {
    fontSize: 13,
    fontWeight: '600',
  }
});
