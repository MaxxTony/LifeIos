import { Spacing, Typography, Colors } from '@/constants/theme';
import { useStore } from '@/store/useStore';
import { useThemeColors } from '@/hooks/useThemeColors';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { formatLocalDate, getTodayLocal } from '@/utils/dateUtils';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState, useEffect } from 'react';
import { Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function EditTaskScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const colors = useThemeColors();
  const { tasks, updateTask } = useStore();

  const task = tasks.find(t => t.id === id);

  const [text, setText] = useState('');
  const [priority, setPriority] = useState<'high' | 'medium' | 'low'>('medium');
  const [date] = useState(new Date());
  const [startTime, setStartTime] = useState(new Date());
  const [endTime, setEndTime] = useState(new Date());

  const [pickerMode, setPickerMode] = useState<'start' | 'end' | null>(null);

  useEffect(() => {
    if (task) {
      setText(task.text);
      setPriority(task.priority || 'medium');
      if (task.startTime) setStartTime(parseTimeString(task.startTime));
      if (task.endTime) setEndTime(parseTimeString(task.endTime));
    }
  }, [task]);

  const parseTimeString = (timeStr: string) => {
    if (!timeStr || typeof timeStr !== 'string') return new Date();
    try {
      const parts = timeStr.trim().split(/\s+/);
      const timePart = parts[0];
      const modifier = parts[1] ? parts[1].toUpperCase() : null;
      let [hours, minutes] = timePart.split(':').map(Number);
      if (modifier === 'PM' && hours < 12) hours += 12;
      else if (modifier === 'AM' && hours === 12) hours = 0;
      const d = new Date();
      d.setHours(hours, minutes, 0, 0);
      return isNaN(d.getTime()) ? new Date() : d;
    } catch (e) {
      return new Date();
    }
  };

  const formatTime = (d: Date) => {
    if (!d || isNaN(d.getTime())) return 'Not set';
    return d.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit', 
      hour12: true 
    });
  };

  const formatDate = (d: Date) => {
    return d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const handleSave = () => {
    if (!text.trim() || !task) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    updateTask(task.id, {
      text: text.trim(),
      priority,
      date: getTodayLocal(),
      startTime: formatTime(startTime),
      endTime: formatTime(endTime),
    });
    router.back();
  };

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

  const PriorityChip = ({ level, label, color }: { level: typeof priority, label: string, color: string }) => (
    <TouchableOpacity
      onPress={() => {
        setPriority(level);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }}
      style={[
        styles.priorityChip,
        { backgroundColor: colors.isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)', borderColor: colors.border },
        priority === level && { backgroundColor: color + '20', borderColor: color }
      ]}
    >
      <Ionicons name="flag" size={14} color={priority === level ? color : colors.textSecondary + '60'} />
      <Text style={[styles.priorityText, { color: colors.textSecondary }, priority === level && { color }]}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient 
        colors={colors.isDark ? [colors.background, colors.primaryTransparent] : [colors.background, colors.primaryVeryTransparent]} 
        style={StyleSheet.absoluteFill} 
      />

      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity 
            onPress={() => router.back()} 
            style={[styles.closeBtn, { backgroundColor: colors.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }]}
          >
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Edit Task</Text>
          <TouchableOpacity onPress={handleSave} disabled={!text.trim()} style={styles.headerSave}>
             <Text style={[styles.saveLink, { color: colors.primary }, !text.trim() && { opacity: 0.5 }]}>Save</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={[styles.inputSection, { backgroundColor: colors.isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)', borderColor: colors.border }]}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Task Description</Text>
            <TextInput
              style={[styles.textInput, { color: colors.text }]}
              placeholder="What needs to be done?"
              placeholderTextColor={colors.textSecondary + '70'}
              value={text}
              onChangeText={setText}
              multiline
            />
          </View>

          <View style={styles.section}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Priority Level</Text>
            <View style={styles.priorityRow}>
              <PriorityChip level="high" label="High" color={colors.danger} />
              <PriorityChip level="medium" label="Medium" color="#FFB347" />
              <PriorityChip level="low" label="Low" color={colors.success} />
            </View>
          </View>

          <View style={[styles.selectItem, { backgroundColor: colors.isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)', borderColor: colors.border, opacity: 0.6 }]}>
            <View style={styles.selectLeft}>
              <Ionicons name="calendar-outline" size={20} color={colors.primary} />
              <Text style={[styles.selectLabel, { color: colors.textSecondary }]}>Date (Locked to Today)</Text>
            </View>
            <Text style={[styles.selectValue, { color: colors.text }]}>{formatDate(date)}</Text>
          </View>

          <View style={styles.timeRow}>
            <TouchableOpacity
              style={[styles.selectItem, { flex: 1, backgroundColor: colors.isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)', borderColor: colors.border }]}
              onPress={() => setPickerMode('start')}
            >
              <View style={styles.selectLeft}>
                <Ionicons name="time-outline" size={20} color={colors.primary} />
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
                <Ionicons name="time-outline" size={20} color={colors.primary} />
                <View>
                  <Text style={[styles.selectLabelSmall, { color: colors.textSecondary }]}>End Time</Text>
                  <Text style={[styles.selectValue, { color: colors.text }]}>{formatTime(endTime)}</Text>
                </View>
              </View>
            </TouchableOpacity>
          </View>


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
                <DateTimePicker
                  value={pickerMode === 'start' ? (startTime || new Date()) : (endTime || new Date())}
                  mode="time"
                  is24Hour={false}
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={(e, d) => {
                    if (Platform.OS === 'android') {
                      setPickerMode(null);
                    }
                    if (d) {
                      const now = new Date();
                      if (pickerMode === 'start') {
                        if (d < now) {
                          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                          setStartTime(now);
                          if (endTime <= now) {
                            setEndTime(new Date(now.getTime() + 30 * 60000));
                          }
                        } else {
                          setStartTime(d);
                          if (d >= endTime) {
                            setEndTime(new Date(d.getTime() + 30 * 60000));
                          }
                        }
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
                  textColor={colors.text}
                  themeVariant={colors.isDark ? "dark" : "light"}
                />
              </View>
            </View>
          </Modal>

          <TouchableOpacity
            style={[styles.updateButton, !text.trim() && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={!text.trim()}
          >
            <LinearGradient
              colors={colors.gradient}
              style={styles.gradientBtn}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Text style={[styles.saveButtonText, { color: '#FFF' }]}>Update Changes</Text>
            </LinearGradient>
          </TouchableOpacity>
        </ScrollView>
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
  headerSave: {
    paddingHorizontal: 12,
  },
  saveLink: {
    fontSize: 16,
    fontWeight: '700',
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
  updateButton: {
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
  doneBtn: {
    marginLeft: 'auto',
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
  }
});
