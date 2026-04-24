import { BlurView } from '@/components/BlurView';
import { Spacing, Typography } from '@/constants/theme';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useStore } from '@/store/useStore';
import { getTodayLocal } from '@/utils/dateUtils';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { ChevronRight, Clock, Flag, Plus } from 'lucide-react-native';
import React, { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
export const DailyTasksWidget = React.memo(function DailyTasksWidget() {
  const router = useRouter();
  const colors = useThemeColors();
  // Selectors: only re-render when tasks or toggleTask changes, not on focus ticks.
  const tasks = useStore(s => s.tasks);
  const toggleTask = useStore(s => s.actions.toggleTask);

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
    medium: colors.warning, // Standardized: replaced hardcoded hex
    low: colors.success
  };

  // C-5: Check if task is pending sync
  const pendingActions = useStore(s => s.pendingActions);
  const isSyncing = (id: string) => pendingActions.some(a => a.id === id);

  return (
    <View style={[styles.container, { borderColor: colors.border }]}>
      <BlurView intensity={20} tint={colors.isDark ? "dark" : "light"} style={styles.blur}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>Daily Tasks</Text>
          <TouchableOpacity
            onPress={() => router.push('/tasks/create')}
            style={[styles.addBtn, { backgroundColor: colors.primaryTransparent, borderColor: colors.primary + '40' }]}
            accessibilityLabel="Create new task"
            accessibilityRole="button"
            accessibilityHint="Navigates to the task creation screen"
          >
            <Plus size={18} color={colors.primary} strokeWidth={2.5} accessibilityLabel="Plus icon" />
          </TouchableOpacity>
        </View>

        <View style={styles.list}>
          {todayTasks.length > 0 ? todayTasks.slice(0, 5).map((task) => {
            const syncing = isSyncing(task.id);
            const taskBg = colors.isDark ? styles.taskItemDark : styles.taskItemLight;

            return (
              <View
                key={task.id}
                style={[
                  styles.taskItem,
                  taskBg,
                  { borderColor: colors.border },
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
                    Haptics.notificationAsync(
                      task.completed
                        ? Haptics.NotificationFeedbackType.Warning
                        : Haptics.NotificationFeedbackType.Success
                    );
                    toggleTask(task.id);
                  }}
                  hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
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
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
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
                      {syncing && (
                        <View style={{ marginBottom: 4 }}>
                          <Ionicons name="cloud-upload-outline" size={12} color={colors.primaryMuted} accessibilityLabel="Syncing to cloud" />
                        </View>
                      )}
                    </View>
                    <View style={styles.taskMeta}>
                      <View style={[styles.metaItem, colors.isDark ? styles.metaItemDark : styles.metaItemLight]}>
                        <Flag size={10} color={priorityColors[task.priority]} accessibilityLabel="Priority flag" />
                        <Text style={[styles.metaText, { color: priorityColors[task.priority || 'medium'] }]}>
                          {(task.priority || 'medium').toUpperCase()}
                        </Text>
                      </View>
                      {task.startTime && (
                        <View style={[styles.metaItem, colors.isDark ? styles.metaItemDarkVariant : styles.metaItemLightVariant]}>
                          <Clock size={10} color={colors.textSecondary} accessibilityLabel="Scheduled time" />
                          <Text style={[styles.metaText, { color: colors.textSecondary }]}>{task.startTime}</Text>
                        </View>
                      )}
                      {task.status === 'missed' && (
                        <Text style={[styles.missedTag, { color: colors.danger, backgroundColor: colors.danger + '15' }]}>Missed</Text>
                      )}
                    </View>
                  </View>
                  <ChevronRight size={16} color={colors.textSecondary} accessibilityLabel="Expand icon" />
                </TouchableOpacity>
              </View>
            );
          }) : (
            <View style={styles.emptyState}>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No tasks for today. Start fresh? ✨</Text>
              <TouchableOpacity
                onPress={() => router.push('/tasks/create')}
                style={[styles.emptyCta, { backgroundColor: colors.primary + '15', borderColor: colors.primary + '30' }]}
                accessibilityLabel="Add your first task for today"
                accessibilityRole="button"
              >
                <Plus size={14} color={colors.primary} strokeWidth={2.5} />
                <Text style={[styles.emptyCtaText, { color: colors.primary }]}>Add a task</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {todayTasks.length > 5 && (
          <TouchableOpacity
            onPress={() => router.push('/all-tasks')}
            style={styles.viewMore}
            accessibilityLabel="View all daily tasks"
            accessibilityRole="button"
          >
            <Text style={[styles.viewMoreText, { color: colors.primary }]}>
              +{todayTasks.length - 5} more daily tasks
            </Text>
          </TouchableOpacity>
        )}
      </BlurView>
    </View>

  );
});

const styles = StyleSheet.create({
  container: {
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    marginBottom: Spacing.md,
  },
  blur: {
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
    width: 36,
    height: 36,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
  },
  list: {
    gap: Spacing.sm,
  },
  taskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: 18,
    borderWidth: 1,
  },
  taskItemDark: {
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  taskItemLight: {
    backgroundColor: 'rgba(255,255,255,0.8)',
  },
  taskCompleted: {
    opacity: 0.7,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    marginRight: Spacing.md,
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
    gap: Spacing.sm,
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
  metaItemDark: {
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  metaItemLight: {
    backgroundColor: 'rgba(0,0,0,0.03)',
  },
  metaItemDarkVariant: {
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  metaItemLightVariant: {
    backgroundColor: 'rgba(0,0,0,0.04)',
  },
  metaText: {
    ...Typography.labelSmall,
    fontSize: 10,
  },
  missedTag: {
    ...Typography.labelSmall,
    fontSize: 9,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  emptyState: {
    paddingVertical: Spacing.lg,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 13,
    fontWeight: '500',
  },
  emptyCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: Spacing.sm,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  emptyCtaText: {
    fontSize: 13,
    fontWeight: '600',
  },
  viewMore: {
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
  },
  viewMoreText: {
    fontSize: 12,
    fontWeight: '700',
  },
});
