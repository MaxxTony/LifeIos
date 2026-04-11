import { Spacing, Typography } from '@/constants/theme';
import { useStore } from '@/store/useStore';
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
      
      if (isNaN(hours) || isNaN(minutes)) {
        // Fallback or attempt another parse if needed
        return new Date();
      }

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
      date: getTodayLocal(), // Keep it on today's list
      startTime: formatTime(startTime),
      endTime: formatTime(endTime),
    });
    
    router.back();
  };

  if (!task) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Task not found</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backLink}>Go Back</Text>
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
          <Text style={styles.headerTitle}>Edit Task</Text>
          <TouchableOpacity onPress={handleSave} disabled={!text.trim()} style={styles.headerSave}>
             <Text style={[styles.saveLink, !text.trim() && { opacity: 0.5 }]}>Save</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.inputSection}>
            <Text style={styles.label}>Task Description</Text>
            <TextInput
              style={styles.textInput}
              placeholder="What needs to be done?"
              placeholderTextColor="rgba(255,255,255,0.2)"
              value={text}
              onChangeText={setText}
              multiline
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>Priority Level</Text>
            <View style={styles.priorityRow}>
              <PriorityChip level="high" label="High" color="#FF4B4B" />
              <PriorityChip level="medium" label="Medium" color="#FFB347" />
              <PriorityChip level="low" label="Low" color="#00D68F" />
            </View>
          </View>

          <View
            style={[styles.selectItem, { opacity: 0.8 }]}
          >
            <View style={styles.selectLeft}>
              <Ionicons name="calendar-outline" size={20} color="rgba(124, 92, 255, 0.5)" />
              <Text style={styles.selectLabel}>Date (Locked to Today)</Text>
            </View>
            <Text style={styles.selectValue}>{formatDate(date)}</Text>
          </View>

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
               <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
            </TouchableOpacity>
            
            <View style={styles.sheetContainer}>
              <View style={styles.sheetHeader}>
                <View style={styles.sheetHandle} />
                <TouchableOpacity 
                  onPress={() => {
                    setPickerMode(null);
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                  style={styles.doneBtn}
                >
                  <Text style={styles.doneBtnText}>Done</Text>
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
                        // Ensure start time is not in the past
                        if (d < now) {
                          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                          setStartTime(now);
                          // If end time is now behind start time, bump it
                          if (endTime <= now) {
                            setEndTime(new Date(now.getTime() + 30 * 60000));
                          }
                        } else {
                          setStartTime(d);
                          // Ensure end time is after start time
                          if (d >= endTime) {
                            setEndTime(new Date(d.getTime() + 30 * 60000));
                          }
                        }
                      } else {
                        // Ensure end time is after start time
                        if (d <= startTime) {
                          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                          setEndTime(new Date(startTime.getTime() + 30 * 60000));
                        } else {
                          setEndTime(d);
                        }
                      }
                    }
                  }}
                  textColor="white"
                  themeVariant="dark"
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
              colors={['#7C5CFF', '#5B8CFF']}
              style={styles.gradientBtn}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Text style={styles.saveButtonText}>Update Changes</Text>
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
  headerSave: {
    paddingHorizontal: 12,
  },
  saveLink: {
    color: '#7C5CFF',
    fontSize: 16,
    fontWeight: '700',
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
  updateButton: {
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
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheetContainer: {
    backgroundColor: '#14141A',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingBottom: 40,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
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
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  sheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
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
    backgroundColor: 'rgba(124, 92, 255, 0.15)',
    borderRadius: 12,
  },
  doneBtnText: {
    color: '#7C5CFF',
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
    backgroundColor: '#000',
  },
  errorText: {
    color: '#FFF',
    fontSize: 18,
    marginBottom: 10,
  },
  backLink: {
    color: '#7C5CFF',
    fontSize: 16,
  }
});
