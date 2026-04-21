import { SkeletonBlock } from '@/components/ui/Skeleton';
import { Spacing } from '@/constants/theme';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useStore } from '@/store/useStore';
import { Task } from '@/store/types';
import { formatLocalDate, getTodayLocal } from '@/utils/dateUtils';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { ChevronLeft, ChevronRight, Clock, Flag, Plus } from 'lucide-react-native';
import React, { useCallback, useMemo, useRef, useEffect, useState } from 'react';
import { Platform, SectionList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useIsFocused } from '@react-navigation/native';

const AnimatedSectionList = Animated.createAnimatedComponent(SectionList) as any;


interface Section {
  label: string;
  data: Task[];
}

function getDateLabel(dateStr: string, today: string, tomorrow: string, weekEnd: string): string {
  if (dateStr < today) return 'Overdue';
  if (dateStr === today) return 'Today';
  if (dateStr === tomorrow) return 'Tomorrow';
  if (dateStr <= weekEnd) return 'This Week';
  return 'Later';
}

function TasksSkeleton() {
  const colors = useThemeColors();
  return (
    <View style={{ gap: Spacing.md }}>
      {[200, 150, 180].map((w, i) => (
        <View key={i} style={[styles.taskCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <SkeletonBlock width="60%" height={14} borderRadius={6} />
          <View style={{ marginTop: 12, gap: 8 }}>
            <SkeletonBlock width="100%" height={12} borderRadius={4} />
            <SkeletonBlock width="80%" height={12} borderRadius={4} />
          </View>
        </View>
      ))}
    </View>
  );
}

// Memoized Task Item to prevent unnecessary re-renders during scroll
const TaskItem = React.memo(({
  task,
  priorityColors,
  onToggle,
  router
}: {
  task: Task;
  priorityColors: any;
  onToggle: (id: string) => void;
  router: any
}) => {
  const colors = useThemeColors();
  return (
    <TouchableOpacity
      onPress={() => router.push(`/tasks/${task.id}`)}
      activeOpacity={0.7}
      style={[
        styles.taskCard,
        { backgroundColor: colors.card, borderColor: colors.border },
        task.completed && styles.taskCompleted,
        task.status === 'missed' && { borderColor: colors.danger + '30' },
      ]}
      accessibilityLabel={`Task: ${task.text}, Priority: ${task.priority}`}
      accessibilityRole="button"
    >
      <View style={styles.taskCardContent}>
        <TouchableOpacity
          style={[
            styles.checkbox,
            { borderColor: task.status === 'missed' ? colors.danger : priorityColors[task.priority] },
            task.completed && [styles.checkboxChecked, { backgroundColor: priorityColors[task.priority] }],
            task.date > getTodayLocal() && !task.completed && { borderColor: colors.textSecondary, opacity: 0.5 }
          ]}
          onPress={() => onToggle(task.id)}
          hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
          accessibilityLabel={task.completed ? "Mark incomplete" : "Mark complete"}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: task.completed }}
        >
          {task.completed && <Ionicons name="checkmark" size={14} color="#FFF" />}
          {task.status === 'missed' && !task.completed && (
            <Ionicons name="close" size={12} color={colors.danger} />
          )}
          {task.date > getTodayLocal() && !task.completed && (
            <Ionicons name="lock-closed" size={12} color={colors.textSecondary} />
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
            <View style={[styles.metaItem, { backgroundColor: colors.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)', borderColor: colors.border }]}>
              <Ionicons name="calendar-outline" size={10} color={colors.textSecondary} />
              <Text style={[styles.metaText, { color: colors.textSecondary }]}>
                {new Date(task.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </Text>
            </View>
          </View>
        </View>
        <ChevronRight size={18} color={colors.textSecondary} opacity={0.5} />
      </View>
    </TouchableOpacity>
  );
});

export default function AllTasksScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const isFocused = useIsFocused();
  const tasks = useStore(s => s.tasks);
  const tasksLoaded = useStore(s => s.syncStatus.tasksLoaded);
  const toggleTask = useStore(s => s.actions.toggleTask);

  const [activeTab, setActiveTab] = useState<'History' | 'Today' | 'Upcoming'>('Today');

  const today = useMemo(() => getTodayLocal(), [isFocused]);
  const priorityWeight = { high: 1, medium: 2, low: 3 };

  const priorityColors = useMemo(() => ({
    high: colors.danger,
    medium: colors.isDark ? '#FFB347' : '#D97706',
    low: colors.success
  }), [colors]);

  const tasksRef = useRef(tasks);
  useEffect(() => {
    tasksRef.current = tasks;
  }, [tasks]);

  const handleToggle = useCallback((id: string) => {
    const task = tasksRef.current.find(t => t.id === id);
    if (task && task.status !== 'missed') {
      Haptics.notificationAsync(
        task.completed
          ? Haptics.NotificationFeedbackType.Warning
          : Haptics.NotificationFeedbackType.Success
      );
      toggleTask(id);
    }
  }, [toggleTask]);

  const { tomorrow, weekEnd } = useMemo(() => {
    const tomorrowDate = new Date();
    tomorrowDate.setDate(tomorrowDate.getDate() + 1);
    const weekEndDate = new Date();
    weekEndDate.setDate(weekEndDate.getDate() + 6);
    return {
      tomorrow: formatLocalDate(tomorrowDate),
      weekEnd: formatLocalDate(weekEndDate),
    };
  }, [today]);

  const sections = useMemo<Section[]>(() => {
    let filteredTasks = tasks;
    if (activeTab === 'Today') {
      filteredTasks = tasks.filter(t => t.status === 'pending' && t.date <= today);
    } else if (activeTab === 'Upcoming') {
      filteredTasks = tasks.filter(t => t.date > today);
    } else if (activeTab === 'History') {
      filteredTasks = tasks.filter(t => t.status === 'completed' || t.status === 'missed');
    }

      const sorted = [...filteredTasks].sort((a, b) => {
      if (activeTab === 'History') {
        if (a.date !== b.date) return a.date > b.date ? -1 : 1;
        return (b.dueTime || 0) - (a.dueTime || 0); // T-25: Sub-sort historical by time desc
      }
      if (a.date !== b.date) return a.date < b.date ? -1 : 1;
      
      // T-25 FIX: Sub-sort by Time (dueTime) FIRST, then Priority fallback
      if (a.dueTime !== b.dueTime) {
        return (a.dueTime || Infinity) - (b.dueTime || Infinity);
      }
      
      if (priorityWeight[a.priority] !== priorityWeight[b.priority]) {
        return priorityWeight[a.priority] - priorityWeight[b.priority];
      }
      return (a.createdAt || 0) - (b.createdAt || 0);
    });

    const sectionMap: Record<string, Task[]> = {};

    if (activeTab === 'History') {
      sectionMap['Completed / Missed'] = sorted;
    } else if (activeTab === 'Today') {
      sectionMap['Overdue'] = [];
      sectionMap['Today'] = [];
      for (const task of sorted) {
        if (task.date < today) sectionMap['Overdue'].push(task as Task);
        else sectionMap['Today'].push(task as Task);
      }
    } else {
      sectionMap['Tomorrow'] = [];
      sectionMap['This Week'] = [];
      sectionMap['Later'] = [];
      for (const task of sorted) {
        const label = getDateLabel(task.date, today, tomorrow, weekEnd);
        if (sectionMap[label]) sectionMap[label].push(task as Task);
      }
    }

    return Object.entries(sectionMap)
      .filter(([, t]) => t.length > 0)
      .map(([label, t]) => ({ label, data: t }));
  }, [tasks, today, tomorrow, weekEnd, activeTab]);

  const totalCount = sections.reduce((acc, curr) => acc + curr.data.length, 0);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.glow, { top: -100, right: -100, backgroundColor: colors.primary + '15' }]} />
      <View style={[styles.glow, { bottom: -150, left: -150, backgroundColor: colors.secondary + '10' }]} />

      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <View style={styles.headerContainer}>
          <BlurView intensity={20} tint={colors.isDark ? 'dark' : 'light'} style={styles.headerBlur}>
            <View style={styles.headerContent}>
              <TouchableOpacity
                onPress={() => router.back()}
                style={[styles.liquidBtn, { backgroundColor: colors.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)', borderColor: colors.border }]}
                activeOpacity={0.7}
                accessibilityLabel="Back"
                accessibilityRole="button"
                hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
              >
                <ChevronLeft size={22} color={colors.text} />
              </TouchableOpacity>

              <View style={styles.headerCenter}>
                <Text style={[styles.headerTitle, { color: colors.text }]}>All Tasks</Text>
                {totalCount > 0 && tasksLoaded && (
                  <Text style={[styles.headerCount, { color: colors.textSecondary }]}>{totalCount} task{totalCount !== 1 ? 's' : ''}</Text>
                )}
              </View>

              <TouchableOpacity
                onPress={() => router.push('/tasks/create')}
                style={styles.plusBtnContainer}
                activeOpacity={0.8}
                accessibilityLabel="Create task"
                accessibilityRole="button"
                hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
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

        <View style={[styles.tabContainer, { backgroundColor: colors.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]}>
          {['History', 'Today', 'Upcoming'].map((tab) => (
            <TouchableOpacity 
              key={tab} 
              style={[styles.tabButton, activeTab === tab && { backgroundColor: colors.isDark ? '#333' : '#FFF', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 }]}
              onPress={() => setActiveTab(tab as any)}>
              <Text style={[styles.tabLabel, { color: activeTab === tab ? colors.text : colors.textSecondary }]}>{tab}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* T-24 FIX: Offline Skeletons Timeout */}
        {(() => {
          const [timedOut, setTimedOut] = React.useState(false);
          React.useEffect(() => {
            if (tasksLoaded) return;
            const t = setTimeout(() => setTimedOut(true), 5000);
            return () => clearTimeout(t);
          }, [tasksLoaded]);

          if (!tasksLoaded && !timedOut) {
            return <View style={{ padding: Spacing.md }}><TasksSkeleton /></View>;
          }
          
          if (!tasksLoaded && timedOut) {
            return (
              <View style={{ padding: 20, alignItems: 'center' }}>
                <Ionicons name="cloud-offline-outline" size={24} color={colors.textSecondary} />
                <Text style={{ color: colors.textSecondary, fontSize: 13, marginTop: 8 }}>Working with local cache only...</Text>
              </View>
            );
          }

          return (
            <AnimatedSectionList
              sections={sections}
              keyExtractor={(item: Task) => item.id}
              renderItem={({ item: task }: { item: Task }) => (
                <TaskItem
                  task={task}
                  priorityColors={priorityColors}
                  onToggle={handleToggle}
                  router={router}
                />
              )}
              renderSectionHeader={({ section: { label, data } }: { section: Section }) => (
                <View style={styles.sectionHeader}>
                  <Text style={[
                    styles.sectionLabel,
                    { 
                      color: label === 'Overdue' ? colors.danger : 
                             (label === 'Today' ? colors.primary : colors.textSecondary) 
                    }
                  ]}>
                    {label}
                  </Text>
                  <View style={[styles.sectionLine, { backgroundColor: colors.border }]} />
                  <Text style={[styles.sectionCount, { color: colors.textSecondary }]}>
                    {data.length}
                  </Text>
                </View>
              )}
              contentContainerStyle={styles.scrollContent}
              stickySectionHeadersEnabled={false}
              // Optimization props for large lists
              initialNumToRender={10}
              windowSize={5}
              maxToRenderPerBatch={5}
              removeClippedSubviews={Platform.OS === 'android'}
              ListEmptyComponent={
                <View style={styles.emptyState}>
                  <View style={[styles.emptyIconContainer, { backgroundColor: colors.primary + '10' }]}>
                    <Ionicons name="sparkles" size={32} color={colors.primary} />
                  </View>
                  <Text style={[styles.emptyText, { color: colors.text }]}>No tasks yet</Text>
                  <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>Tap + to schedule your first task ✨</Text>
                </View>
              }
            />
          );
        })()}
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
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: Spacing.md,
    marginTop: 16,
    marginBottom: 8,
    borderRadius: 16,
    padding: 4,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 12,
  },
  tabLabel: {
    fontSize: 13,
    fontWeight: '700',
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
  taskCard: {
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
    marginBottom: 12,
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
