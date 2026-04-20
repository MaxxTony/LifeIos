import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch, Platform, TextInput, ScrollView, Modal, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useStore } from '@/store/useStore';
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

/**
 * Parses a reminder time string (e.g. "8:30 pm") into a Date object.
 * Returns null if the string is invalid or empty.
 */
const parseReminderTimeToDate = (timeStr: string): Date | null => {
  if (!timeStr) return null;
  const cleaned = timeStr.trim().replace(/\s+/g, ' ').toUpperCase();
  const match = cleaned.match(/^(\d{1,2}):(\d{2})\s?(AM|PM)$/);
  if (!match) return null;
  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const modifier = match[3];
  if (modifier === 'PM' && hours < 12) hours += 12;
  else if (modifier === 'AM' && hours === 12) hours = 0;
  const d = new Date();
  d.setHours(hours, minutes, 0, 0);
  return d;
};

export default function ConfigScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
   const colors = useThemeColors();
  const habits = useStore(s => s.habits);
  const [isFinalizing, setIsFinalizing] = useState(false);
  
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

  
  const [monthlyTarget, setMonthlyTarget] = useState<number>(() => {
    if (params.monthlyTarget) {
      try { return parseInt(params.monthlyTarget as string); } catch { /* fall through */ }
    }
    return 1;
  });

  const [monthlyDay, setMonthlyDay] = useState<number>(() => {
    if (params.monthlyDay) {
      try { return parseInt(params.monthlyDay as string); } catch { /* fall through */ }
    }
    return new Date().getDate();
  });

  // 'fixed' = specific day each month (e.g. 7th), 'count' = any X times per month
  const [monthlyMode, setMonthlyMode] = useState<'fixed' | 'count'>(
    params.monthlyDay ? 'fixed' : 'count'
  );

  const [showMonthlyDayPicker, setShowMonthlyDayPicker] = useState(false);

  // Pre-populate reminder state from params (supports edit mode)
  const [reminderEnabled, setReminderEnabled] = useState(
    params.reminderEnabled === 'true'
  );
  const [reminderTime, setReminderTime] = useState<Date>(() => {
    if (params.reminderTime) {
      const parsed = parseReminderTimeToDate(params.reminderTime as string);
      if (parsed) return parsed;
    }
    return new Date();
  });
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

    // MIN-01 FIX: Validate that at least one day is selected for weekly habits
    if (frequency === 'weekly' && selectedDays.length === 0) {
      Alert.alert(
        'No Days Selected',
        'Please select at least one day for your habit schedule.',
        [{ text: 'OK' }]
      );
      return;
    }

    // Prevent duplicate habit names
    const isDuplicate = habits.some(h => 
      h.title.trim().toLowerCase() === title.trim().toLowerCase() && 
      (!params.habitId || h.id !== params.habitId)
    );

    if (isDuplicate) {
      Alert.alert(
        'Habit Already Exists',
        'You already have a habit with this name. Please choose a different name to avoid confusion.',
        [{ text: 'OK' }]
      );
      return;
    }

    setIsFinalizing(true);

    router.push({
      pathname: '/(habits)/goal',
      params: {
        ...params,
        title: title.trim(),
        icon: params.icon || '✨',
        frequency,
        selectedDays: JSON.stringify(selectedDays),
        monthlyTarget: monthlyMode === 'fixed' ? '1' : monthlyTarget.toString(),
        monthlyDay: monthlyMode === 'fixed' ? monthlyDay.toString() : '',
        reminderEnabled: reminderEnabled ? 'true' : 'false',
        reminderTime: reminderEnabled ? formatTime(reminderTime) : '',
      }
    });
  };

  // C-14: Prevent accidental exit with unsaved work
  const [initialTitle] = useState(params.title?.toString() || '');
  const isDirty = title.trim() !== initialTitle.trim();
  const navigation = Platform.OS !== 'web' ? require('@react-navigation/native').useNavigation() : null;
  React.useEffect(() => {
    if (!navigation) return;

    // C-14 FIX: On native-stack, 'beforeRemove' can conflict with native gestures (like drag-to-dismiss).
    // We disable the gesture when dirty to avoid the state mismatch error.
    navigation.setOptions({
      gestureEnabled: !isDirty,
    });

    const unsubscribe = navigation.addListener('beforeRemove', (e: any) => {
      // If we are moving forward to 'goal', don't block
      if (e.data.action.type === 'NAVIGATE' && e.data.action.payload?.name === 'goal') return;
      
      // C-14 FIX: If the screen is not focused, it means it's being removed by a parent or a dismissal from a screen above.
      // We allow this without showing an alert to prevent "ghost alerts" during flow completion.
      if (!navigation.isFocused()) return;
      
      if (!isDirty || isFinalizing) return;

      e.preventDefault();

      require('react-native').Alert.alert(
        'Discard changes?',
        'You have unsaved changes. Are you sure you want to discard them and leave?',
        [
          { text: "Don't leave", style: 'cancel', onPress: () => {} },
          {
            text: 'Discard',
            style: 'destructive',
            onPress: () => navigation.dispatch(e.data.action),
          },
        ]
      );
    });

    return unsubscribe;
  }, [navigation, isDirty]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          {params.habitId ? 'Edit habit' : 'Create a new habit'}
        </Text>
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

          {frequency === 'weekly' && (
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
          )}

          {frequency === 'monthly' && (
            <View style={[styles.monthlyStepperContainer, { backgroundColor: colors.isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)', borderColor: colors.border }]}>

              {/* Mode toggle */}
              <Text style={[styles.monthlyStepperLabel, { color: colors.text, marginBottom: 14 }]}>How do you want to track this?</Text>
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 20 }}>
                <TouchableOpacity
                  onPress={() => setMonthlyMode('fixed')}
                  style={[{
                    flex: 1, paddingVertical: 12, borderRadius: 14, alignItems: 'center', borderWidth: 1,
                    backgroundColor: monthlyMode === 'fixed' ? colors.primary : 'transparent',
                    borderColor: monthlyMode === 'fixed' ? colors.primary : colors.border,
                  }]}
                >
                  <Text style={{ fontSize: 13, fontWeight: '800', color: monthlyMode === 'fixed' ? '#FFF' : colors.textSecondary }}>📅 Fixed Date</Text>
                  <Text style={{ fontSize: 10, fontWeight: '500', color: monthlyMode === 'fixed' ? 'rgba(255,255,255,0.7)' : colors.textSecondary + '80', marginTop: 3 }}>e.g. every 7th</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setMonthlyMode('count')}
                  style={[{
                    flex: 1, paddingVertical: 12, borderRadius: 14, alignItems: 'center', borderWidth: 1,
                    backgroundColor: monthlyMode === 'count' ? colors.primary : 'transparent',
                    borderColor: monthlyMode === 'count' ? colors.primary : colors.border,
                  }]}
                >
                  <Text style={{ fontSize: 13, fontWeight: '800', color: monthlyMode === 'count' ? '#FFF' : colors.textSecondary }}>🔢 Count Goal</Text>
                  <Text style={{ fontSize: 10, fontWeight: '500', color: monthlyMode === 'count' ? 'rgba(255,255,255,0.7)' : colors.textSecondary + '80', marginTop: 3 }}>e.g. 20 times/month</Text>
                </TouchableOpacity>
              </View>

              {/* Fixed Date mode */}
              {monthlyMode === 'fixed' && (
                <View>
                  <Text style={{ color: colors.textSecondary, fontSize: 12, marginBottom: 12 }}>The habit will be tracked on this specific date every month</Text>
                  <TouchableOpacity
                    onPress={() => setShowMonthlyDayPicker(true)}
                    style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)', borderRadius: 14, paddingHorizontal: 20, paddingVertical: 14 }}
                  >
                    <Text style={{ color: colors.textSecondary, fontSize: 15, fontWeight: '600' }}>Every month on the</Text>
                    <View style={{ backgroundColor: colors.primary, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 6 }}>
                      <Text style={{ color: '#FFF', fontWeight: '800', fontSize: 16 }}>{monthlyDay}{monthlyDay === 1 ? 'st' : monthlyDay === 2 ? 'nd' : monthlyDay === 3 ? 'rd' : 'th'}</Text>
                    </View>
                  </TouchableOpacity>
                </View>
              )}

              {/* Count Goal mode */}
              {monthlyMode === 'count' && (
                <View style={{ alignItems: 'center' }}>
                  <Text style={{ color: colors.textSecondary, fontSize: 12, marginBottom: 16 }}>Complete this habit any day — just hit your monthly count</Text>
                  <View style={styles.stepperControls}>
                    <TouchableOpacity
                      onPress={() => setMonthlyTarget(prev => Math.max(1, prev - 1))}
                      style={[styles.stepperBtn, { backgroundColor: colors.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]}
                    >
                      <Text style={[styles.stepperBtnText, { color: colors.text }]}>-</Text>
                    </TouchableOpacity>
                    <View style={{ alignItems: 'center' }}>
                      <Text style={[styles.stepperValue, { color: colors.primary }]}>{monthlyTarget}</Text>
                      <Text style={{ color: colors.textSecondary, fontSize: 10, fontWeight: '600' }}>times / month</Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => setMonthlyTarget(prev => Math.min(30, prev + 1))}
                      style={[styles.stepperBtn, { backgroundColor: colors.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]}
                    >
                      <Text style={[styles.stepperBtnText, { color: colors.text }]}>+</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          )}

          {/* Day-of-month picker modal */}
          <Modal
            visible={showMonthlyDayPicker}
            transparent={true}
            animationType="slide"
            onRequestClose={() => setShowMonthlyDayPicker(false)}
          >
            <TouchableOpacity
              activeOpacity={1}
              onPress={() => setShowMonthlyDayPicker(false)}
              style={styles.modalOverlay}
            >
              <TouchableOpacity activeOpacity={1} style={[styles.modalContent, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.modalHeader}>
                  <View style={[styles.sheetHandle, { backgroundColor: colors.textSecondary + '40' }]} />
                  <Text style={[styles.modalTitle, { color: colors.text }]}>Pick a day of month</Text>
                  <TouchableOpacity onPress={() => setShowMonthlyDayPicker(false)} style={[styles.doneBtnPill, { backgroundColor: colors.primaryTransparent }]}>
                    <Text style={[styles.doneBtnText, { color: colors.primary }]}>Done</Text>
                  </TouchableOpacity>
                </View>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingVertical: 16, paddingHorizontal: 4 }}>
                  {Array.from({ length: 28 }, (_, i) => i + 1).map(day => (
                    <TouchableOpacity
                      key={day}
                      onPress={() => { setMonthlyDay(day); setShowMonthlyDayPicker(false); }}
                      style={[{
                        width: 44, height: 44, borderRadius: 12,
                        justifyContent: 'center', alignItems: 'center',
                        backgroundColor: monthlyDay === day ? colors.primary : colors.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'
                      }]}
                    >
                      <Text style={{ fontSize: 14, fontWeight: '700', color: monthlyDay === day ? '#FFF' : colors.text }}>{day}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <Text style={{ color: colors.textSecondary, fontSize: 11, textAlign: 'center', paddingBottom: 8 }}>Days 29–31 are skipped in short months</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          </Modal>

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
            (!title.trim() || ((frequency === 'weekly' || frequency === 'monthly') && selectedDays.length === 0)) && styles.nextBtnDisabled
          ]} 
          onPress={handleNext}
          disabled={!title.trim()}
        >
          <Text style={[styles.nextBtnText, { color: '#FFF' }]}>
            {params.habitId ? 'Update habit' : 'Create habit'}
          </Text>
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
  monthlyStepperContainer: {
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    alignItems: 'center',
    marginBottom: 35,
  },
  monthlyStepperLabel: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 16,
  },
  stepperControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 24,
  },
  stepperBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepperBtnText: {
    fontSize: 24,
    fontWeight: '500',
    marginTop: -2,
  },
  stepperValue: {
    fontSize: 32,
    fontWeight: '800',
    width: 50,
    textAlign: 'center',
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
