import { Spacing, Typography } from '@/constants/theme';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useStore } from '@/store/useStore';
import { formatLocalDate } from '@/utils/dateUtils';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Calendar, Clock, Flag, X } from 'lucide-react-native';
import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Defined at module scope to avoid recreation on every render
type PriorityLevel = 'high' | 'medium' | 'low';

function PriorityChip({
  level, label, color, selected, onSelect, borderColor, isDark,
}: {
  level: PriorityLevel; label: string; color: string;
  selected: boolean; onSelect: (l: PriorityLevel) => void;
  borderColor: string; isDark: boolean;
}) {
  return (
    <TouchableOpacity
      onPress={() => {
        onSelect(level);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }}
      style={[
        styles.priorityChip,
        { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)', borderColor },
        selected && { backgroundColor: color + '20', borderColor: color }
      ]}
    >
      <Flag size={14} color={selected ? color : borderColor + '60'} />
      <Text style={[styles.priorityText, { color: borderColor }, selected && { color }]}>{label}</Text>
    </TouchableOpacity>
  );
}

export default function CreateTaskScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const addTask = useStore(s => s.actions.addTask);
  const updateTask = useStore(s => s.actions.updateTask);

  const [text, setText] = useState('');
  const [priority, setPriority] = useState<PriorityLevel>('medium');
  const [date, setDate] = useState(new Date());

  const [startTime, setStartTime] = useState(new Date());
  const [endTime, setEndTime] = useState(new Date(Date.now() + 3600 * 1000));
  const [repeat, setRepeat] = useState<'none' | 'daily' | 'weekly' | 'monthly'>('none');

  // 'start' | 'end' | 'date' | null
  const [pickerMode, setPickerMode] = useState<'start' | 'end' | 'date' | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const formatTime = (d: Date) => {
    if (!d || isNaN(d.getTime())) return 'Not set';
    return d.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatDate = (d: Date) => {
    return d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  };

  const handleSave = () => {
    if (!text.trim()) return;

    setIsSubmitting(true);
    // C-14: Clear any navigation guards before moving back.
    // We use a flag or just let the back() handle it.
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const taskId = addTask(
      text.trim(),
      formatTime(startTime),
      formatTime(endTime),
      priority,
      formatLocalDate(date)
    );

    // F-3: Set repeat if not none using the direct ID returned from addTask
    if (repeat !== 'none' && taskId) {
      useStore.getState().actions.updateTask(taskId, { repeat });
    }

    router.back();
  };

  // C-14: Prevent accidental exit with unsaved work
  const isDirty = text.trim().length > 0 || priority !== 'medium' || repeat !== 'none';
  const navigation = Platform.OS !== 'web' ? require('@react-navigation/native').useNavigation() : null;

  React.useEffect(() => {
    if (!navigation) return;

    // C-14 FIX: On native-stack, 'beforeRemove' can conflict with native gestures (like drag-to-dismiss).
    // We disable the gesture when dirty to avoid the "removed natively but didn't get removed from JS state" error.
    navigation.setOptions({
      gestureEnabled: !isDirty,
    });

    const unsubscribe = navigation.addListener('beforeRemove', (e: any) => {
      // If we are intentionally saving or nothing has changed, don't block
      if (isSubmitting || !isDirty) {
        return;
      }

      e.preventDefault();

      Alert.alert(
        'Discard changes?',
        'You have unsaved changes. Are you sure you want to discard them and leave?',
        [
          { text: "Don't leave", style: 'cancel', onPress: () => { } },
          {
            text: 'Discard',
            style: 'destructive',
            onPress: () => navigation.dispatch(e.data.action),
          },
        ]
      );
    });

    return unsubscribe;
  }, [navigation, isDirty, isSubmitting]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={colors.isDark ? [colors.background, colors.primaryTransparent] : [colors.background, colors.primaryVeryTransparent]}
        style={StyleSheet.absoluteFill}
      />

      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={[styles.closeBtn, { backgroundColor: colors.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }]}
            >
              <X size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: colors.text }]}>New Task</Text>
            <View style={{ width: 44 }} />
          </View>

          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <View style={[styles.inputSection, { backgroundColor: colors.isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)', borderColor: colors.border }]}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>What needs to be done?</Text>
              <TextInput
                style={[styles.textInput, { color: colors.text }]}
                placeholder="Enter task name..."
                placeholderTextColor={colors.textSecondary + '70'}
                value={text}
                onChangeText={setText}
                autoFocus
                multiline
              />
            </View>

            <View style={styles.section}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Set Priority</Text>
              <View style={styles.priorityRow}>
                <PriorityChip level="high" label="High" color={colors.danger} selected={priority === 'high'} onSelect={setPriority} borderColor={colors.textSecondary} isDark={colors.isDark} />
                <PriorityChip level="medium" label="Medium" color={colors.isDark ? '#FFB347' : '#D97706'} selected={priority === 'medium'} onSelect={setPriority} borderColor={colors.textSecondary} isDark={colors.isDark} />
                <PriorityChip level="low" label="Low" color={colors.success} selected={priority === 'low'} onSelect={setPriority} borderColor={colors.textSecondary} isDark={colors.isDark} />
              </View>
            </View>

            <TouchableOpacity
              style={[styles.selectItem, { backgroundColor: colors.isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)', borderColor: colors.border }]}
              onPress={() => setPickerMode('date')}
            >
              <View style={styles.selectLeft}>
                <Calendar size={20} color={colors.primary} />
                <View>
                  <Text style={[styles.selectLabelSmall, { color: colors.textSecondary }]}>Task Date</Text>
                  <Text style={[styles.selectValue, { color: colors.text }]}>{formatDate(date)}</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
            </TouchableOpacity>

            <View style={styles.timeRow}>
              <TouchableOpacity
                style={[styles.selectItem, { flex: 1, backgroundColor: colors.isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)', borderColor: colors.border }]}
                onPress={() => setPickerMode('start')}
              >
                <View style={styles.selectLeft}>
                  <Clock size={20} color={colors.primary} />
                  <View>
                    <Text style={[styles.selectLabelSmall, { color: colors.textSecondary }]}>Start Time</Text>
                    <Text style={[styles.selectValue, { color: colors.text }]}>{formatTime(startTime)}</Text>
                  </View>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.selectItem, { flex: 1, backgroundColor: colors.isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)', borderColor: colors.border }]}
                onPress={() => setPickerMode('end')}
              >
                <View style={styles.selectLeft}>
                  <Clock size={20} color={colors.secondary} />
                  <View>
                    <Text style={[styles.selectLabelSmall, { color: colors.textSecondary }]}>End Time</Text>
                    <Text style={[styles.selectValue, { color: colors.text }]}>{formatTime(endTime)}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            </View>

            <View style={styles.section}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Repeat</Text>
              <View style={styles.priorityRow}>
                {(['none', 'daily', 'weekly', 'monthly'] as const).map((r) => (
                  <TouchableOpacity
                    key={r}
                    onPress={() => {
                      setRepeat(r);
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }}
                    style={[
                      styles.repeatChip,
                      { backgroundColor: colors.isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)', borderColor: colors.border },
                      repeat === r && { backgroundColor: colors.primary + '20', borderColor: colors.primary }
                    ]}
                  >
                    <Text style={[styles.repeatText, { color: colors.textSecondary }, repeat === r && { color: colors.primary }]}>
                      {r.charAt(0).toUpperCase() + r.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>


            {/* Picker Modal — handles date, start time, and end time */}
            {Platform.OS === 'ios' ? (
              <Modal
                visible={!!pickerMode}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setPickerMode(null)}
              >
                <TouchableOpacity
                  style={styles.modalOverlay}
                  activeOpacity={1}
                  onPress={() => setPickerMode(null)}
                >
                  <BlurView intensity={20} tint={colors.isDark ? "dark" : "light"} style={StyleSheet.absoluteFill} />
                </TouchableOpacity>

                <View style={[styles.sheetContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <View style={[styles.sheetHeader, { borderBottomColor: colors.border }]}>
                    <View style={[styles.sheetHandle, { backgroundColor: colors.textSecondary + '40' }]} />
                    <Text style={[styles.modalHeaderTitle, { color: colors.text }]}>
                      {pickerMode === 'date' ? 'Select Date' : pickerMode === 'start' ? 'Start Time' : 'End Time'}
                    </Text>
                    <TouchableOpacity
                      onPress={() => {
                        setPickerMode(null);
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      }}
                      style={[styles.doneBtn, { backgroundColor: colors.primaryTransparent }]}
                    >
                      <Text style={[styles.doneBtnText, { color: colors.primary }]}>Done</Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.pickerWrapper}>
                    {pickerMode === 'date' ? (
                      <DateTimePicker
                        value={date}
                        mode="date"
                        display="spinner"
                        minimumDate={new Date()}
                        onChange={(e, d) => { if (d) setDate(d); }}
                        textColor={colors.text}
                        themeVariant={colors.isDark ? "dark" : "light"}
                      />
                    ) : (
                      <DateTimePicker
                        value={pickerMode === 'start' ? startTime : endTime}
                        mode="time"
                        is24Hour={false}
                        display="spinner"
                        onChange={(e, d) => {
                          if (!d) return;
                          if (pickerMode === 'start') {
                            setStartTime(d);
                            if (d >= endTime) setEndTime(new Date(d.getTime() + 30 * 60000));
                          } else {
                            if (d <= startTime) {
                              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                              setEndTime(new Date(startTime.getTime() + 30 * 60000));
                            } else {
                              setEndTime(d);
                            }
                          }
                        }}
                        textColor={colors.text}
                        themeVariant={colors.isDark ? "dark" : "light"}
                      />
                    )}
                  </View>
                </View>
              </Modal>
            ) : (
              !!pickerMode && (
                <DateTimePicker
                  value={pickerMode === 'date' ? date : pickerMode === 'start' ? startTime : endTime}
                  mode={pickerMode === 'date' ? 'date' : 'time'}
                  is24Hour={false}
                  display="default"
                  minimumDate={pickerMode === 'date' ? new Date() : undefined}
                  onChange={(e, d) => {
                    const mode = pickerMode;
                    setPickerMode(null);
                    if (e.type === 'set' && d) {
                      if (mode === 'date') {
                        setDate(d);
                      } else if (mode === 'start') {
                        setStartTime(d);
                        if (d >= endTime) setEndTime(new Date(d.getTime() + 30 * 60000));
                      } else {
                        if (d <= startTime) {
                          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                          setEndTime(new Date(startTime.getTime() + 30 * 60000));
                        } else {
                          setEndTime(d);
                        }
                      }
                    }
                  }}
                />
              )
            )}

            <TouchableOpacity
              style={[styles.saveButton, !text.trim() && styles.saveButtonDisabled]}
              onPress={handleSave}
              disabled={!text.trim()}
            >
              <LinearGradient
                colors={colors.gradient}
                style={styles.gradientBtn}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Text style={[styles.saveButtonText, { color: '#FFF' }]}>Create Task</Text>
              </LinearGradient>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
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
  content: {
    padding: Spacing.md,
    gap: Spacing.lg,
    paddingBottom: 40,
  },
  inputSection: {
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  textInput: {
    fontSize: 18,
    minHeight: 40,
    textAlignVertical: 'top',
    fontFamily: 'Inter-Regular',
  },
  section: {
    gap: 12,
  },
  priorityRow: {
    flexDirection: 'row',
    gap: 10,
  },
  priorityChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    gap: 6,
  },
  priorityText: {
    fontSize: 14,
    fontWeight: '600',
  },
  selectItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
  },
  selectLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  selectLabel: {
    fontSize: 15,
    fontWeight: '500',
  },
  selectValue: {
    fontSize: 15,
    fontWeight: '600',
  },
  timeRow: {
    flexDirection: 'row',
    gap: 12,
  },
  selectLabelSmall: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  saveButton: {
    marginTop: 20,
    borderRadius: 18,
    overflow: 'hidden',
    height: 58,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  gradientBtn: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 17,
    fontWeight: '800',
  },
  modalOverlay: {
    flex: 1,
  },
  sheetContainer: {
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingBottom: 40,
    borderWidth: 1,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    position: 'absolute',
    left: '50%',
    marginLeft: -20,
    top: 8,
  },
  modalHeaderTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 10,
  },
  doneBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  doneBtnText: {
    fontSize: 16,
    fontWeight: '700',
  },
  pickerWrapper: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  repeatChip: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
  },
  repeatText: {
    fontSize: 12,
    fontWeight: '700',
  }
});
