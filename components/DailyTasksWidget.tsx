import { Spacing, Typography } from '@/constants/theme';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useStore } from '@/store/useStore';
import { getTodayLocal } from '@/utils/dateUtils';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { ChevronRight, Clock, Flag, Plus } from 'lucide-react-native';
import React, { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
export function DailyTasksWidget() {
  const router = useRouter();
  const colors = useThemeColors();
  // Selectors: only re-render when tasks or toggleTask changes, not on focus ticks.
  const tasks = useStore(s => s.tasks);
  const toggleTask = useStore(s => s.toggleTask);

  const today = getTodayLocal();

  const priorityWeight = { high: 1, medium: 2, low: 3 };

  const todayTasks = useMemo(() => tasks
    .filter(t => t.date === today)
    .sort((a, b) => {
      if (priorityWeight[a.priority] !== priorityWeight[b.priority]) {
        return priorityWeight[a.priority] - priorityWeight[b.priority];
      }
      return (a.dueTime || 0) - (b.dueTime || 0);
    }), [tasks, today]);

  const priorityColors = {
    high: colors.danger,
    medium: colors.isDark ? '#FFB347' : '#D97706', // Dynamic amber/orange
    low: colors.success
  };

  return (
    <View style={[styles.container, { borderColor: colors.border }]}>
      <BlurView intensity={20} tint={colors.isDark ? "dark" : "light"} style={styles.blur}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>Daily Tasks</Text>
          <TouchableOpacity
            onPress={() => router.push('/tasks/create')}
            style={[styles.addBtn, { backgroundColor: colors.primaryTransparent, borderColor: colors.primaryMuted }]}
            accessibilityLabel="Add new task"
            accessibilityRole="button"
          >
            <Plus size={18} color={colors.primary} strokeWidth={2.5} />
          </TouchableOpacity>
        </View>

        <View style={styles.list}>
          {todayTasks.length > 0 ? todayTasks.slice(0, 5).map((task) => (
            <View
              key={task.id}
              style={[
                styles.taskItem,
                { backgroundColor: colors.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.8)', borderColor: colors.border },
                task.completed && styles.taskCompleted
              ]}
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
                  <Text
                    style={[
                      styles.taskText,
                      { color: colors.text },
                      task.completed && [styles.taskTextCompleted, { color: colors.textSecondary + '80' }]
                    ]}
                    numberOfLines={1}
                  >
                    {task.text}
                  </Text>
                  <View style={styles.taskMeta}>
                    <View style={[styles.metaItem, { backgroundColor: colors.isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' }]}>
                      <Flag size={10} color={priorityColors[task.priority]} />
                      <Text style={[styles.metaText, { color: priorityColors[task.priority || 'medium'] }]}>
                        {(task.priority || 'medium').toUpperCase()}
                      </Text>
                    </View>
                    {task.startTime && (
                      <View style={[styles.metaItem, { backgroundColor: colors.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)' }]}>
                        <Clock size={10} color={colors.textSecondary} />
                        <Text style={[styles.metaText, { color: colors.textSecondary }]}>{task.startTime}</Text>
                      </View>
                    )}
                    {task.status === 'missed' && (
                      <Text style={[styles.missedTag, { color: colors.danger, backgroundColor: colors.danger + '15' }]}>Missed</Text>
                    )}
                  </View>
                </View>
                <ChevronRight size={16} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
          )) : (
            <View style={styles.emptyState}>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No tasks for today. Start fresh? ✨</Text>
            </View>
          )}
        </View>

        {todayTasks.length > 5 && (
          <TouchableOpacity
            onPress={() => router.push('/all-tasks')}
            style={styles.viewMore}
          >
            <Text style={[styles.viewMoreText, { color: colors.primary }]}>
              +{todayTasks.length - 5} more daily tasks
            </Text>
          </TouchableOpacity>
        )}
      </BlurView>
    </View>

  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
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
  list: {
    gap: 12,
  },
  taskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
  },
  taskCompleted: {
    opacity: 0.7,
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
    fontWeight: '600',
    marginBottom: 4,
  },
  taskTextCompleted: {
    textDecorationLine: 'line-through',
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
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  metaText: {
    ...Typography.labelSmall,
    fontSize: 9,
  },
  missedTag: {
    ...Typography.labelSmall,
    fontSize: 8,
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
    fontWeight: '500',
  },
  viewMore: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
  },
  viewMoreText: {
    fontSize: 12,
    fontWeight: '700',
  },
});
