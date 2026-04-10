import { Spacing, Typography } from '@/constants/theme';
import { useStore } from '@/store/useStore';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { formatLocalDate, getTodayLocal } from '@/utils/dateUtils';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function CreateTaskScreen() {
  const router = useRouter();
  const { addTask } = useStore();

  const [text, setText] = useState('');
  const [priority, setPriority] = useState<'high' | 'medium' | 'low'>('medium');
  const [date, setDate] = useState(new Date());
  const [startTime, setStartTime] = useState(new Date(new Date().setHours(9, 0, 0, 0)));
  const [endTime, setEndTime] = useState(new Date(new Date().setHours(10, 0, 0, 0)));

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [pickerMode, setPickerMode] = useState<'start' | 'end' | null>(null);

  const formatTime = (d: Date) => {
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (d: Date) => {
    return d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const handleSave = () => {
    if (!text.trim()) return;

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    addTask(
      text.trim(),
      formatTime(startTime),
      formatTime(endTime),
      priority,
      getTodayLocal() // Always save as today
    );
    router.back();
  };

  const PriorityChip = ({ level, label, color }: { level: typeof priority, label: string, color: string }) => (
    <TouchableOpacity
      onPress={() => {
        setPriority(level);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }}
      style={[
        styles.priorityChip,
        priority === level && { backgroundColor: color + '20', borderColor: color }
      ]}
    >
      <Ionicons name="flag" size={14} color={priority === level ? color : 'rgba(255,255,255,0.3)'} />
      <Text style={[styles.priorityText, priority === level && { color }]}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#0B0B0F', '#1A1A2E']} style={StyleSheet.absoluteFill} />

      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
            <Ionicons name="close" size={24} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>New Task</Text>
          <View style={{ width: 44 }} />
        </View>

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {/* Task Name Input */}
          <View style={styles.inputSection}>
            <Text style={styles.label}>What needs to be done?</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Enter task name..."
              placeholderTextColor="rgba(255,255,255,0.2)"
              value={text}
              onChangeText={setText}
              autoFocus
              multiline
            />
          </View>

          {/* Priority Selection */}
          <View style={styles.section}>
            <Text style={styles.label}>Set Priority</Text>
            <View style={styles.priorityRow}>
              <PriorityChip level="high" label="High" color="#FF4B4B" />
              <PriorityChip level="medium" label="Medium" color="#FFB347" />
              <PriorityChip level="low" label="Low" color="#00D68F" />
            </View>
          </View>

          {/* Date Selection */}
          <View
            style={[styles.selectItem, { opacity: 0.8 }]}
          >
            <View style={styles.selectLeft}>
              <Ionicons name="calendar-outline" size={20} color="rgba(124, 92, 255, 0.5)" />
              <Text style={styles.selectLabel}>Date (Locked to Today)</Text>
            </View>
            <Text style={styles.selectValue}>{formatDate(date)}</Text>
          </View>

          {/* Time Picker */}
          <View style={styles.timeRow}>
            <TouchableOpacity
              style={[styles.selectItem, { flex: 1 }]}
              onPress={() => setPickerMode('start')}
            >
              <View style={styles.selectLeft}>
                <Ionicons name="time-outline" size={20} color="#7C5CFF" />
                <View>
                  <Text style={styles.selectLabelSmall}>Start Time</Text>
                  <Text style={styles.selectValue}>{formatTime(startTime)}</Text>
                </View>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.selectItem, { flex: 1 }]}
              onPress={() => setPickerMode('end')}
            >
              <View style={styles.selectLeft}>
                <Ionicons name="time-outline" size={20} color="#7C5CFF" />
                <View>
                  <Text style={styles.selectLabelSmall}>End Time</Text>
                  <Text style={styles.selectValue}>{formatTime(endTime)}</Text>
                </View>
              </View>
            </TouchableOpacity>
          </View>


          {pickerMode && (
            <DateTimePicker
              value={pickerMode === 'start' ? startTime : endTime}
              mode="time"
              is24Hour={false}
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(e, d) => {
                setPickerMode(null);
                if (d) {
                  if (pickerMode === 'start') setStartTime(d);
                  else setEndTime(d);
                }
              }}
              textColor="white"
              themeVariant="dark"
            />
          )}

          <TouchableOpacity
            style={[styles.saveButton, !text.trim() && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={!text.trim()}
          >
            <LinearGradient
              colors={['#7C5CFF', '#5B8CFF']}
              style={styles.gradientBtn}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Text style={styles.saveButtonText}>Create Task</Text>
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
    backgroundColor: '#000',
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
    color: '#FFF',
    fontSize: 18,
    fontFamily: 'Outfit-Bold',
  },
  closeBtn: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 22,
  },
  content: {
    padding: Spacing.md,
    gap: Spacing.lg,
  },
  inputSection: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  label: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  textInput: {
    fontSize: 18,
    color: '#FFF',
    minHeight: 40,
    textAlignVertical: 'top',
    fontFamily: 'Inter-Medium',
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
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1.5,
    borderColor: 'transparent',
    gap: 6,
  },
  priorityText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.4)',
  },
  selectItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  selectLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  selectLabel: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '500',
  },
  selectValue: {
    fontSize: 15,
    color: '#FFF',
    fontWeight: '600',
  },
  timeRow: {
    flexDirection: 'row',
    gap: 12,
  },
  selectLabelSmall: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.4)',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  saveButton: {
    marginTop: 20,
    borderRadius: 18,
    overflow: 'hidden',
    height: 56,
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
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  }
});
