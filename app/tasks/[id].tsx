import { Spacing, Typography } from '@/constants/theme';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useStore } from '@/store/useStore';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { AlertTriangle, Calendar, CheckCircle, Circle, Flag, Pencil, Plus, Repeat, RotateCcw, Trash2, X } from 'lucide-react-native';
import React from 'react';
import { Alert, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function TaskDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const colors = useThemeColors();
  const tasks = useStore(s => s.tasks);
  const toggleTask = useStore(s => s.actions.toggleTask);
  const removeTask = useStore(s => s.actions.removeTask);
  const updateSubtask = useStore(s => s.actions.updateSubtask);
  const toggleSubtask = useStore(s => s.actions.toggleSubtask);
  const updateTask = useStore(s => s.actions.updateTask);

  const [newSubtaskText, setNewSubtaskText] = React.useState('');

  const task = tasks.find(t => t.id === id);

  if (!task) {
    return (
      <View style={[styles.errorContainer, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorText, { color: colors.text }]}>Task not found</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={[styles.backLink, { color: colors.primary }]}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleToggle = () => {
    const isUndo = task.completed;
    Haptics.notificationAsync(
      isUndo ? Haptics.NotificationFeedbackType.Warning : Haptics.NotificationFeedbackType.Success
    );
    toggleTask(task.id);
    // When completing: go back to the list (task is done, no reason to stay).
    // When undoing: stay on the screen so the user sees the task revert to pending.
    if (!isUndo) router.back();
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Task',
      'Are you sure you want to delete this task? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            removeTask(task.id);
            router.back();
          }
        }
      ]
    );
  };

  const priorityColors = {
    high: colors.danger,
    medium: colors.isDark ? '#FFB347' : '#D97706',
    low: colors.success
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={colors.isDark ? [colors.background, colors.primaryTransparent] : [colors.background, colors.primaryVeryTransparent]}
        style={StyleSheet.absoluteFill}
      />

      {/* Background Glows */}
      <LinearGradient
        colors={[colors.primaryTransparent, 'transparent']}
        style={[styles.glow, { top: -100, left: -50, shadowColor: colors.primary }]}
      />
      <LinearGradient
        colors={[colors.isDark ? colors.primary + '20' : colors.primary + '0A', 'transparent']}
        style={[styles.glow, { bottom: 100, right: -100, shadowColor: colors.primary }]}
      />

      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={[styles.closeBtn, { backgroundColor: colors.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }]}
          >
            <X size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Task Details</Text>
          <View style={styles.headerActions}>
            <TouchableOpacity
              onPress={() => router.push(`/tasks/edit/${task.id}`)}
              style={[styles.editBtn, { backgroundColor: colors.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }]}
            >
              <Pencil size={20} color={colors.text} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleDelete}
              style={[styles.deleteBtn, { backgroundColor: colors.danger + '15' }]}
            >
              <Trash2 size={20} color={colors.danger} />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <BlurView intensity={20} tint={colors.isDark ? "dark" : "light"} style={[styles.card, { borderColor: colors.border }]}>
            <View style={[styles.priorityBadge, { backgroundColor: priorityColors[task.priority || 'medium'] + '20' }]}>
              <Flag size={14} color={priorityColors[task.priority || 'medium']} />
              <Text style={[styles.priorityText, { color: priorityColors[task.priority || 'medium'] }]}>
                {(task.priority || 'medium').toUpperCase()}
              </Text>
            </View>

            <Text style={[styles.taskTitle, { color: colors.text }]}>{task.text}</Text>

            {task.systemComment && (
              <View style={[styles.commentBox, { backgroundColor: colors.danger + '10', borderColor: colors.danger + '20' }]}>
                <AlertTriangle size={16} color={colors.danger} style={{ marginRight: 8, marginTop: 2 }} />
                <Text style={[styles.commentText, { color: colors.isDark ? '#FF7676' : colors.danger }]}>{task.systemComment}</Text>
              </View>
            )}

            <View style={[styles.infoGrid, { borderTopColor: colors.border }]}>
              <View style={styles.infoItem}>
                <View style={[styles.infoIconBox, { backgroundColor: colors.primaryTransparent }]}>
                  <Calendar size={20} color={colors.primary} />
                </View>
                <View>
                  <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Scheduled for</Text>
                  <Text style={[styles.infoValue, { color: colors.text }]}>
                    {new Date(task.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                  </Text>
                </View>
              </View>

              <View style={styles.infoItem}>
                <View style={[styles.infoIconBox, { backgroundColor: colors.warning + '15' }]}>
                  <Repeat size={20} color={colors.warning} />
                </View>
                <View>
                  <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Recurrence</Text>
                  <Text style={[styles.infoValue, { color: colors.text }]}>
                    {task.repeat && task.repeat !== 'none' ? `Repeats ${task.repeat}` : 'One-off task'}
                  </Text>
                </View>
              </View>
            </View>
          </BlurView>

          {/* F-4: Subtasks Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Subtasks</Text>
              <Text style={[styles.subtaskCount, { color: colors.textSecondary }]}>
                {(task.subtasks?.filter(st => st.completed).length || 0)} / {(task.subtasks?.length || 0)}
              </Text>
            </View>

            <View style={[styles.subtaskList, { borderColor: colors.border }]}>
              {task.subtasks?.map(st => (
                <TouchableOpacity
                  key={st.id}
                  style={[styles.subtaskItem, { borderBottomColor: colors.border }]}
                  onPress={() => {
                    toggleSubtask(task.id, st.id);
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                >
                  {st.completed ? (
                    <CheckCircle size={20} color={colors.success} fill={colors.success + '20'} />
                  ) : (
                    <Circle size={20} color={colors.textSecondary + '40'} />
                  )}
                  <Text style={[styles.subtaskText, { color: colors.text }, st.completed && { color: colors.textSecondary, textDecorationLine: 'line-through' }]}>
                    {st.text}
                  </Text>
                  <TouchableOpacity
                    onPress={() => {
                      const updatedSubtasks = task.subtasks?.filter(s => s.id !== st.id);
                      updateTask(task.id, { subtasks: updatedSubtasks });
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    }}
                  >
                    <X size={16} color={colors.textSecondary + '40'} />
                  </TouchableOpacity>
                </TouchableOpacity>
              ))}

              <View style={styles.addSubtaskRow}>
                <Plus size={20} color={colors.primary} />
                <TextInput
                  style={[styles.subtaskInput, { color: colors.text }]}
                  placeholder="Add a subtask..."
                  placeholderTextColor={colors.textSecondary + '60'}
                  value={newSubtaskText}
                  onChangeText={setNewSubtaskText}
                  onSubmitEditing={() => {
                    if (!newSubtaskText.trim()) return;
                    const newSubtask = { id: Math.random().toString(36).substring(7), text: newSubtaskText.trim(), completed: false };
                    const updatedSubtasks = [...(task.subtasks || []), newSubtask];
                    updateTask(task.id, { subtasks: updatedSubtasks });
                    setNewSubtaskText('');
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                  }}
                  blurOnSubmit={false}
                />
              </View>
            </View>
          </View>

          <View style={styles.statusSection}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Task Progress</Text>
            <View style={[styles.statusContainer, { backgroundColor: colors.isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)', borderColor: colors.border }]}>
              <View style={[styles.statusLine, { backgroundColor: task.completed ? colors.success : colors.primary }]} />
              <View style={[styles.statusIndicator, { backgroundColor: task.completed ? colors.success + '40' : colors.primary + '40' }]}>
                {task.completed ? (
                  <CheckCircle size={14} color={colors.text} />
                ) : (
                  <RotateCcw size={14} color={colors.text} />
                )}
              </View>
              <Text style={[styles.statusText, { color: colors.textSecondary }]}>
                {task.completed ? 'Tasks finalized and archived' :
                  task.status === 'missed' ? 'Deadline passed without completion' :
                    'Work in progress...'}
              </Text>
            </View>
          </View>
        </ScrollView>

        {
          task.status !== 'missed' && (
            <View style={styles.footer}>
              <TouchableOpacity style={styles.completeBtn} onPress={handleToggle}>
                {task.completed ? (
                  <View style={[styles.gradientBtn, { backgroundColor: colors.isDark ? '#1a332a' : '#f0fdf4', borderRadius: 20, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 }]}>
                    <RotateCcw size={20} color={colors.success} />
                    <Text style={[styles.completeBtnText, { color: colors.success }]}>Undo Completion</Text>
                  </View>
                ) : (
                  <LinearGradient
                    colors={colors.gradient}
                    style={styles.gradientBtn}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    <CheckCircle size={20} color="#FFF" style={{ marginRight: 8 }} />
                    <Text style={[styles.completeBtnText, { color: '#FFF' }]}>Mark as Completed</Text>
                  </LinearGradient>
                )}
              </TouchableOpacity>
            </View>
          )
        }
      </SafeAreaView >
    </View >
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    height: 60,
  },
  headerTitle: {
    ...Typography.h3,
    fontSize: 18,
    fontFamily: 'Outfit-Bold',
  },
  closeBtn: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 22,
  },
  deleteBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
  },
  editBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  content: {
    padding: Spacing.md,
    gap: 24,
  },
  card: {
    borderRadius: 32,
    padding: 24,
    borderWidth: 1,
    overflow: 'hidden',
  },
  priorityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 6,
    marginBottom: 16,
  },
  priorityText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  taskTitle: {
    ...Typography.h1,
    fontSize: 32,
    lineHeight: 40,
    fontFamily: 'Outfit-Bold',
    marginVertical: 20,
  },
  section: {
    marginTop: 8,
    paddingHorizontal: 4,
  },
  statusSection: {
    marginTop: 8,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: 16,
    letterSpacing: 1,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
  },
  statusLine: {
    position: 'absolute',
    left: 28,
    top: 0,
    bottom: 0,
    width: 2,
    opacity: 0.1,
  },
  statusIndicator: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  statusText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 18,
  },
  infoGrid: {
    gap: 20,
    marginTop: 8,
    paddingTop: 24,
    borderTopWidth: 1,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  infoLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  infoIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  commentBox: {
    flexDirection: 'row',
    padding: 14,
    borderRadius: 16,
    marginBottom: 24,
    borderWidth: 1,
  },
  commentText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
  },
  footer: {
    padding: Spacing.md,
    paddingBottom: Platform.OS === 'ios' ? 34 : Spacing.md,
    backgroundColor: 'transparent',
  },
  glow: {
    position: 'absolute',
    width: 250,
    height: 250,
    borderRadius: 125,
    opacity: 0.15,
  },
  completeBtn: {
    height: 60,
    borderRadius: 20,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 6,
  },
  gradientBtn: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  completeBtnText: {
    fontSize: 16,
    fontWeight: '700',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 18,
    marginBottom: 10,
  },
  backLink: {
    fontSize: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 12,
  },
  subtaskCount: {
    fontSize: 11,
    fontWeight: '700',
  },
  subtaskList: {
    borderWidth: 1,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.02)',
    overflow: 'hidden',
  },
  subtaskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    gap: 12,
  },
  subtaskText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
  },
  addSubtaskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  subtaskInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
  }
});
