import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Spacing } from '@/constants/theme';
import { useStore } from '@/store/useStore';
import { useThemeColors } from '@/hooks/useThemeColors';
import { getTodayLocal, formatLocalDate } from '@/utils/dateUtils';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Plus, ChevronLeft, ChevronRight, Clock, Flag } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';

interface Task {
  id: string;
  text: string;
  priority: 'high' | 'medium' | 'low';
  date: string;
  completed: boolean;
  status: 'pending' | 'completed' | 'missed';
  startTime?: string;
  dueTime?: number;
}

interface Section {
  label: string;
  tasks: Task[];
}

function getDateLabel(dateStr: string, today: string, tomorrow: string, weekEnd: string): string {
  if (dateStr === today) return 'Today';
  if (dateStr === tomorrow) return 'Tomorrow';
  if (dateStr <= weekEnd) return 'This Week';
  return 'Later';
}

export default function AllTasksScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const tasks = useStore(s => s.tasks);
  const toggleTask = useStore(s => s.toggleTask);

  const today = getTodayLocal();

  const priorityWeight = { high: 1, medium: 2, low: 3 };

  const priorityColors = {
    high: colors.danger,
    medium: colors.isDark ? '#FFB347' : '#D97706',
    low: colors.success
  };

  // Compute date anchors once
  const { tomorrow, weekEnd } = useMemo(() => {
    const tomorrowDate = new Date();
    tomorrowDate.setDate(tomorrowDate.getDate() + 1);

    const weekEndDate = new Date();
    // End of this week = next Sunday (or Saturday depending on locale)
    // Using 6 days ahead as a simple "this week" window
    weekEndDate.setDate(weekEndDate.getDate() + 6);

    return {
      tomorrow: formatLocalDate(tomorrowDate),
      weekEnd: formatLocalDate(weekEndDate),
    };
  }, [today]);

  // Group all tasks into sections, sorted within each group by priority then time
  const sections = useMemo<Section[]>(() => {
    const sorted = [...tasks].sort((a, b) => {
      // Primary: date ascending
      if (a.date !== b.date) return a.date < b.date ? -1 : 1;
      // Secondary: priority
      if (priorityWeight[a.priority] !== priorityWeight[b.priority]) {
        return priorityWeight[a.priority] - priorityWeight[b.priority];
      }
      // Tertiary: start time
      return (a.dueTime || 0) - (b.dueTime || 0);
    });

    const sectionMap: Record<string, Task[]> = {
      Today: [],
      Tomorrow: [],
      'This Week': [],
      Later: [],
    };

    for (const task of sorted) {
      const label = getDateLabel(task.date, today, tomorrow, weekEnd);
      sectionMap[label].push(task as Task);
    }

    // Only return sections that have tasks
    return Object.entries(sectionMap)
      .filter(([, t]) => t.length > 0)
      .map(([label, t]) => ({ label, tasks: t }));
  }, [tasks, today, tomorrow, weekEnd]);

  const totalCount = tasks.length;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Background Glows */}
      <View style={[styles.glow, { top: -100, right: -100, backgroundColor: colors.primary + '15' }]} />
      <View style={[styles.glow, { bottom: -150, left: -150, backgroundColor: colors.secondary + '10' }]} />

      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        {/* Header */}
        <View style={styles.headerContainer}>
          <BlurView intensity={20} tint={colors.isDark ? 'dark' : 'light'} style={styles.headerBlur}>
            <View style={styles.headerContent}>
              <TouchableOpacity
                onPress={() => router.back()}
                style={[styles.liquidBtn, { backgroundColor: colors.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)', borderColor: colors.border }]}
                activeOpacity={0.7}
              >
                <ChevronLeft size={22} color={colors.text} />
              </TouchableOpacity>

              <View style={styles.headerCenter}>
                <Text style={[styles.headerTitle, { color: colors.text }]}>All Tasks</Text>
                {totalCount > 0 && (
                  <Text style={[styles.headerCount, { color: colors.textSecondary }]}>{totalCount} task{totalCount !== 1 ? 's' : ''}</Text>
                )}
              </View>

              <TouchableOpacity
                onPress={() => router.push('/tasks/create')}
                style={styles.plusBtnContainer}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={[colors.primary, colors.secondary]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.plusBtnGradient}
                >
                  <Plus size={22} color="#FFF" strokeWidth={2.5} />
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </BlurView>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          style={{ marginTop: 10 }}
        >
          {sections.length > 0 ? sections.map((section) => (
            <View key={section.label} style={styles.section}>
              {/* Section Header */}
              <View style={styles.sectionHeader}>
                <Text style={[
                  styles.sectionLabel,
                  { color: section.label === 'Today' ? colors.primary : colors.textSecondary }
                ]}>
                  {section.label}
                </Text>
                <View style={[styles.sectionLine, { backgroundColor: colors.border }]} />
                <Text style={[styles.sectionCount, { color: colors.textSecondary }]}>
                  {section.tasks.length}
                </Text>
              </View>

              {/* Tasks */}
              <View style={styles.list}>
                {section.tasks.map((task) => (
                  <TouchableOpacity
                    key={task.id}
                    onPress={() => router.push(`/tasks/${task.id}`)}
                    activeOpacity={0.7}
                    style={[
                      styles.taskCard,
                      { backgroundColor: colors.card, borderColor: colors.border },
                      task.completed && styles.taskCompleted,
                      task.status === 'missed' && { borderColor: colors.danger + '30' },
                    ]}
                  >
                    <View style={styles.taskCardContent}>
                      <TouchableOpacity
                        style={[
                          styles.checkbox,
                          { borderColor: task.status === 'missed' ? colors.danger : priorityColors[task.priority] },
                          task.completed && [styles.checkboxChecked, { backgroundColor: priorityColors[task.priority] }],
                        ]}
                        onPress={() => {
                          if (task.status === 'missed') return;
                          Haptics.notificationAsync(
                            task.completed
                              ? Haptics.NotificationFeedbackType.Warning
                              : Haptics.NotificationFeedbackType.Success
                          );
                          toggleTask(task.id);
                        }}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        {task.completed && <Ionicons name="checkmark" size={14} color="#FFF" />}
                        {task.status === 'missed' && !task.completed && (
                          <Ionicons name="close" size={12} color={colors.danger} />
                        )}
                      </TouchableOpacity>

                      <View style={styles.taskInfo}>
                        <Text
                          style={[
                            styles.taskText,
                            { color: colors.text },
                            task.completed && [styles.taskTextCompleted, { color: colors.textSecondary + '70' }],
                            task.status === 'missed' && { color: colors.textSecondary + '70' },
                          ]}
                          numberOfLines={1}
                        >
                          {task.text}
                        </Text>
                        <View style={styles.taskMeta}>
                          <View style={[styles.metaItem, { backgroundColor: colors.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)', borderColor: colors.border }]}>
                            <Flag size={10} color={priorityColors[task.priority]} />
                            <Text style={[styles.metaText, { color: priorityColors[task.priority] }]}>
                              {task.priority.toUpperCase()}
                            </Text>
                          </View>
                          {task.startTime && (
                            <View style={[styles.metaItem, { backgroundColor: colors.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)', borderColor: colors.border }]}>
                              <Clock size={10} color={colors.textSecondary} />
                              <Text style={[styles.metaText, { color: colors.textSecondary }]}>{task.startTime}</Text>
                            </View>
                          )}
                          {task.status === 'missed' && (
                            <View style={[styles.metaItem, { backgroundColor: colors.danger + '10', borderColor: colors.danger + '20' }]}>
                              <Text style={[styles.metaText, { color: colors.danger }]}>MISSED</Text>
                            </View>
                          )}
                        </View>
                      </View>
                      <ChevronRight size={18} color={colors.textSecondary} opacity={0.5} />
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )) : (
            <View style={styles.emptyState}>
              <View style={[styles.emptyIconContainer, { backgroundColor: colors.primary + '10' }]}>
                <Ionicons name="sparkles" size={32} color={colors.primary} />
              </View>
              <Text style={[styles.emptyText, { color: colors.text }]}>No tasks yet</Text>
              <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>Tap + to schedule your first task ✨</Text>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  glow: { position: 'absolute', width: 300, height: 300, borderRadius: 150, opacity: 0.3, zIndex: -1 },
  headerContainer: {
    marginHorizontal: Spacing.md,
    marginTop: Spacing.sm,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 10 },
      android: { elevation: 4 }
    })
  },
  headerBlur: { paddingVertical: Spacing.md, paddingHorizontal: Spacing.md },
  headerContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: {
    fontFamily: 'Outfit-Bold',
    fontSize: 18,
    textAlign: 'center',
  },
  headerCount: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 1,
  },
  liquidBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  plusBtnContainer: {
    width: 40,
    height: 40,
    borderRadius: 14,
    overflow: 'hidden',
  },
  plusBtnGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    padding: Spacing.md,
    paddingBottom: 60,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  sectionLine: {
    flex: 1,
    height: 1,
  },
  sectionCount: {
    fontSize: 11,
    fontWeight: '700',
  },
  list: { gap: 10 },
  taskCard: {
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  taskCardContent: { flexDirection: 'row', alignItems: 'center' },
  taskCompleted: { opacity: 0.65 },
  checkbox: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    marginRight: 16,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  checkboxChecked: { borderColor: 'transparent' },
  taskInfo: { flex: 1 },
  taskText: { fontSize: 15, fontWeight: '700', marginBottom: 6 },
  taskTextCompleted: { textDecorationLine: 'line-through' },
  taskMeta: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 0.5,
  },
  metaText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
  emptyState: { alignItems: 'center', paddingTop: 80, gap: 12 },
  emptyIconContainer: { width: 64, height: 64, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  emptyText: { fontSize: 18, fontWeight: '800' },
  emptySubtext: { fontSize: 13, opacity: 0.7, textAlign: 'center', paddingHorizontal: 40 }
});
