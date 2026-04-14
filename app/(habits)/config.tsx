import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch, Platform, TextInput, ScrollView, Modal } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useThemeColors } from '@/hooks/useThemeColors';
import { Colors, Typography, Spacing, BorderRadius } from '@/constants/theme';

const DAYS = [
  { label: 'Mo', value: 1 },
  { label: 'Tu', value: 2 },
  { label: 'We', value: 3 },
  { label: 'Th', value: 4 },
  { label: 'Fr', value: 5 },
  { label: 'Sa', value: 6 },
  { label: 'Su', value: 0 },
];

export default function ConfigScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const colors = useThemeColors();
  
  const [title, setTitle] = useState(params.title?.toString() || '');
  const [frequency, setFrequency] = useState<'daily' | 'weekly' | 'monthly'>(
    (params.frequency as 'daily' | 'weekly' | 'monthly') || 'daily'
  );
  // Pre-populate targetDays when editing an existing habit; default to all days for new habits
  const [selectedDays, setSelectedDays] = useState<number[]>(() => {
    if (params.selectedDays) {
      try { return JSON.parse(params.selectedDays as string); } catch { /* fall through */ }
    }
    return [0, 1, 2, 3, 4, 5, 6];
  });
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderTime, setReminderTime] = useState(new Date());
  const [showTimePicker, setShowTimePicker] = useState(false);

  const toggleDay = (day: number) => {
    setSelectedDays(prev => 
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  const onTimeChange = (event: any, selectedDate?: Date) => {
    // On Android, we need to hide the picker after selection (or dismissal)
    if (Platform.OS === 'android') {
      setShowTimePicker(false);
      
      // M-3 FIX: Only update if confirmed with 'OK' (event.type === 'set')
      if (event.type === 'set' && selectedDate) {
        setReminderTime(selectedDate);
      }
    } else {
      // iOS behavior (spinner/compact/inline often updates immediately or via 'Done' button which we handled in Modal)
      if (selectedDate) {
        setReminderTime(selectedDate);
      }
    }
  };

  const formatTime = (date: Date) => {
    let hours = date.getHours();
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'pm' : 'am';
    hours = hours % 12;
    hours = hours ? hours : 12; // the hour '0' should be '12'
    return `${hours}:${minutes} ${ampm}`;
  };

  const handleNext = () => {
    if (!title.trim()) return;

    router.push({
      pathname: '/(habits)/goal',
      params: {
        ...params,
        title: title.trim(),
        icon: params.icon || '✨',
        frequency,
        selectedDays: JSON.stringify(selectedDays),
        reminderEnabled: reminderEnabled ? 'true' : 'false',
        reminderTime: reminderEnabled ? formatTime(reminderTime) : '',
      }
    });
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Create a new habit</Text>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.form}>
          <Text style={[styles.label, { color: colors.text }]}>Name</Text>
          <View style={[styles.inputContainer, { backgroundColor: colors.isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)', borderColor: colors.border }]}>
            <TextInput
              style={[styles.input, { color: colors.text }]}
              placeholder="E.g. Gym Workout"
              placeholderTextColor={colors.textSecondary + '60'}
              value={title}
              onChangeText={setTitle}
              maxLength={60}
            />
            <View style={[styles.iconBox, { backgroundColor: colors.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]}>
               <Text style={{fontSize: 22}}>{params.icon || '✨'}</Text>
            </View>
          </View>

          <Text style={[styles.label, { marginTop: 35, color: colors.text }]}>Frequency</Text>
          <View style={styles.freqRow}>
            {(['daily', 'weekly', 'monthly'] as const).map((f) => (
              <TouchableOpacity 
                key={f} 
                onPress={() => setFrequency(f)}
                style={[
                  styles.freqBtn, 
                  { backgroundColor: colors.isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)', borderColor: colors.border },
                  frequency === f && [styles.freqBtnActive, { backgroundColor: colors.primary, borderColor: colors.primary }]
                ]}
              >
                <Text style={[styles.freqText, { color: colors.textSecondary }, frequency === f && styles.freqTextActive]}>
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.daysRow}>
            {DAYS.map((day) => {
              const isActive = selectedDays.includes(day.value);
              return (
                <TouchableOpacity 
                  key={day.label + day.value}
                  onPress={() => toggleDay(day.value)}
                  style={[
                    styles.dayCircle, 
                    { backgroundColor: colors.isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)', borderColor: colors.border },
                    isActive && [styles.dayCircleActive, { backgroundColor: colors.primary, borderColor: colors.primary }]
                  ]}
                >
                  <Text style={[styles.dayText, { color: colors.textSecondary }, isActive && styles.dayTextActive]}>{day.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={[styles.reminderCard, { backgroundColor: colors.isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)', borderColor: colors.border }]}>
            <View style={styles.reminderHeader}>
              <Text style={[styles.reminderLabel, { color: colors.text }]}>Reminder</Text>
              <Switch
                value={reminderEnabled}
                onValueChange={(val) => {
                  setReminderEnabled(val);
                  // Don't auto-show picker anymore
                }}
                trackColor={{ false: colors.isDark ? '#222' : '#E5E7EB', true: colors.success }}
                thumbColor={'#FFF'}
                ios_backgroundColor={colors.isDark ? '#222' : '#E5E7EB'}
              />
            </View>
            
            {reminderEnabled && (
              <TouchableOpacity 
                style={[styles.timePickerContainer, { borderTopColor: colors.isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)' }]} 
                onPress={() => setShowTimePicker(true)}
              >
                <View style={styles.timeLabelRow}>
                   <Ionicons name="time-outline" size={18} color={colors.textSecondary} />
                   <Text style={[styles.timeLabel, { color: colors.textSecondary }]}>Time</Text>
                </View>
                <View style={[styles.timeValueBox, { backgroundColor: colors.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }]}>
                  <Text style={[styles.timeValue, { color: colors.text }]}>{formatTime(reminderTime)}</Text>
                </View>
              </TouchableOpacity>
            )}
          </View>

          {/* Time Picker Modal/Dialog */}
          {Platform.OS === 'ios' ? (
            <Modal
              visible={showTimePicker}
              transparent={true}
              animationType="fade"
              onRequestClose={() => setShowTimePicker(false)}
            >
              <TouchableOpacity 
                activeOpacity={1} 
                onPress={() => setShowTimePicker(false)}
                style={styles.modalOverlay}
              >
                <TouchableOpacity activeOpacity={1} style={[styles.modalContent, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <View style={styles.modalHeader}>
                    <View style={[styles.sheetHandle, { backgroundColor: colors.textSecondary + '40' }]} />
                    <Text style={[styles.modalTitle, { color: colors.text }]}>Select Time</Text>
                    <TouchableOpacity 
                      onPress={() => setShowTimePicker(false)}
                      style={[styles.doneBtnPill, { backgroundColor: colors.primaryTransparent }]}
                    >
                      <Text style={[styles.doneBtnText, { color: colors.primary }]}>Done</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.pickerWrapper}>
                    <DateTimePicker
                      value={reminderTime}
                      mode="time"
                      is24Hour={false}
                      display="spinner"
                      onChange={onTimeChange}
                      textColor={colors.text}
                      themeVariant={colors.isDark ? "dark" : "light"}
                    />
                  </View>
                </TouchableOpacity>
              </TouchableOpacity>
            </Modal>
          ) : (
            showTimePicker && (
              <DateTimePicker
                value={reminderTime}
                mode="time"
                is24Hour={false}
                display="default"
                onChange={onTimeChange}
              />
            )
          )}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity 
          style={[
            styles.nextBtn, 
            { backgroundColor: colors.primary, shadowColor: colors.primary },
            !title.trim() && styles.nextBtnDisabled
          ]} 
          onPress={handleNext}
          disabled={!title.trim()}
        >
          <Text style={[styles.nextBtnText, { color: '#FFF' }]}>Create habit</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 150,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    flex: 1,
    textAlign: 'center',
    marginRight: 40,
  },
  form: {
    padding: 20,
  },
  label: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 12,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 18,
    height: 68,
    paddingHorizontal: 20,
    borderWidth: 1,
  },
  input: {
    flex: 1,
    fontSize: 17,
    fontWeight: '600',
  },
  iconBox: {
    width: 50,
    height: 50,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  freqRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 25,
  },
  freqBtn: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  freqBtnActive: {
  },
  freqText: {
    fontSize: 14,
    fontWeight: '700',
  },
  freqTextActive: {
    color: '#FFF',
  },
  daysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 35,
  },
  dayCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  dayCircleActive: {
  },
  dayText: {
    fontSize: 15,
    fontWeight: '700',
  },
  dayTextActive: {
    color: '#FFF',
  },
  reminderCard: {
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
  },
  reminderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  reminderLabel: {
    fontSize: 16,
    fontWeight: '700',
  },
  timePickerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
  },
  timeLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timeLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  timeValueBox: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
  },
  timeValue: {
    fontSize: 15,
    fontWeight: '700',
  },
  pickerWrapper: {
    paddingVertical: 10,
    alignItems: 'center',
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    width: '100%',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    borderWidth: 1,
    borderBottomWidth: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: 8,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 10,
  },
  doneBtnPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  doneBtnText: {
    fontSize: 16,
    fontWeight: '700',
  },
  footer: {
    position: 'absolute',
    bottom: 40,
    left: 20,
    right: 20,
  },
  nextBtn: {
    height: 64,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  nextBtnDisabled: {
    opacity: 0.4,
  },
  nextBtnText: {
    fontSize: 17,
    fontWeight: '800',
  }
});
