import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch, Platform, TextInput, ScrollView } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';

const DAYS = [
  { label: 'M', value: 1 },
  { label: 'T', value: 2 },
  { label: 'W', value: 3 },
  { label: 'T', value: 4 },
  { label: 'F', value: 5 },
  { label: 'S', value: 6 },
  { label: 'S', value: 0 },
];

export default function ConfigScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  
  const [title, setTitle] = useState(params.title?.toString() || '');
  const [frequency, setFrequency] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [selectedDays, setSelectedDays] = useState<number[]>(params.title ? [0, 1, 2, 3, 4, 5, 6] : [0, 1, 2, 3, 4, 5, 6]);
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderTime, setReminderTime] = useState(new Date());
  const [showTimePicker, setShowTimePicker] = useState(false);

  const toggleDay = (day: number) => {
    setSelectedDays(prev => 
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  const onTimeChange = (event: any, selectedDate?: Date) => {
    setShowTimePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setReminderTime(selectedDate);
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const handleNext = () => {
    if (!title.trim()) return;

    router.push({
      pathname: '/(habits)/goal',
      params: {
        ...params,
        title: title.trim(),
        frequency,
        selectedDays: JSON.stringify(selectedDays),
        reminderEnabled: reminderEnabled ? 'true' : 'false',
        reminderTime: reminderEnabled ? formatTime(reminderTime) : undefined,
      }
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create a new habit</Text>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.form}>
          <Text style={styles.label}>Name</Text>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="E.g. Gym Workout"
              placeholderTextColor="rgba(255,255,255,0.2)"
              value={title}
              onChangeText={setTitle}
            />
            <View style={styles.iconBox}>
               <Text style={{fontSize: 22}}>{params.icon || '✨'}</Text>
            </View>
          </View>

          <Text style={[styles.label, { marginTop: 35 }]}>Frequency</Text>
          <View style={styles.freqRow}>
            {(['daily', 'weekly', 'monthly'] as const).map((f) => (
              <TouchableOpacity 
                key={f} 
                onPress={() => setFrequency(f)}
                style={[styles.freqBtn, frequency === f && styles.freqBtnActive]}
              >
                <Text style={[styles.freqText, frequency === f && styles.freqTextActive]}>
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
                  style={[styles.dayCircle, isActive && styles.dayCircleActive]}
                >
                  <Text style={[styles.dayText, isActive && styles.dayTextActive]}>{day.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.reminderCard}>
            <View style={styles.reminderHeader}>
              <Text style={styles.reminderLabel}>Reminder</Text>
              <Switch
                value={reminderEnabled}
                onValueChange={setReminderEnabled}
                trackColor={{ false: '#222', true: '#30D158' }}
                thumbColor={'#FFF'}
                ios_backgroundColor="#222"
              />
            </View>
            
            {reminderEnabled && (
              <TouchableOpacity 
                style={styles.timePickerContainer} 
                onPress={() => setShowTimePicker(true)}
              >
                <View style={styles.timeLabelRow}>
                   <Ionicons name="time-outline" size={18} color="rgba(255,255,255,0.4)" />
                   <Text style={styles.timeLabel}>Time</Text>
                </View>
                <View style={styles.timeValueBox}>
                  <Text style={styles.timeValue}>{formatTime(reminderTime)}</Text>
                </View>
              </TouchableOpacity>
            )}
          </View>

          {(showTimePicker || Platform.OS === 'ios') && reminderEnabled && (
            <View style={styles.pickerWrapper}>
              <DateTimePicker
                value={reminderTime}
                mode="time"
                is24Hour={false}
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onValueChange={onTimeChange}
                textColor="#FFF"
              />
            </View>
          )}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity 
          style={[styles.nextBtn, !title.trim() && styles.nextBtnDisabled]} 
          onPress={handleNext}
          disabled={!title.trim()}
        >
          <Text style={styles.nextBtnText}>Create habit</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b0b0f',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 120,
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
    color: '#FFF',
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
    color: 'rgba(255,255,255,0.9)',
    marginBottom: 12,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 18,
    height: 68,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  input: {
    flex: 1,
    color: '#FFF',
    fontSize: 17,
    fontWeight: '600',
  },
  iconBox: {
    width: 50,
    height: 50,
    backgroundColor: 'rgba(255,255,255,0.05)',
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
    backgroundColor: 'rgba(255,255,255,0.04)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  freqBtnActive: {
    backgroundColor: '#FFF',
    borderColor: '#FFF',
  },
  freqText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 14,
    fontWeight: '700',
  },
  freqTextActive: {
    color: '#000',
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
    backgroundColor: 'rgba(255,255,255,0.04)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  dayCircleActive: {
    backgroundColor: '#FFF',
    borderColor: '#FFF',
  },
  dayText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 15,
    fontWeight: '700',
  },
  dayTextActive: {
    color: '#000',
  },
  reminderCard: {
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  reminderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  reminderLabel: {
    fontSize: 16,
    color: '#FFF',
    fontWeight: '700',
  },
  timePickerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.04)',
  },
  timeLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timeLabel: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 15,
    fontWeight: '600',
  },
  timeValueBox: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
  },
  timeValue: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
  },
  pickerWrapper: {
    marginTop: 10,
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderRadius: 20,
  },
  footer: {
    position: 'absolute',
    bottom: 40,
    left: 20,
    right: 20,
    backgroundColor: 'transparent',
  },
  nextBtn: {
    backgroundColor: '#FFF',
    height: 64,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  nextBtnDisabled: {
    opacity: 0.4,
  },
  nextBtnText: {
    color: '#000',
    fontSize: 17,
    fontWeight: '800',
  }
});
