import { useStore } from '@/store/useStore';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { notificationService } from '@/services/notificationService';

const GOALS = [
  { days: 7, label: 'Good', icon: '⭐' },
  { days: 14, label: 'Great', icon: '🔥' },
  { days: 30, label: 'Incredible', icon: '💫' },
  { days: 50, label: 'Unstoppable', icon: '⚡' },
];

export default function GoalScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { addHabit, habits } = useStore();

  const [selectedGoal, setSelectedGoal] = useState(7);

  const handleConfirm = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    
    // Generate ID beforehand for reliable notification scheduling
    const tempId = Math.random().toString(36).substring(7);
    
    const habitData = {
      id: tempId, // Pass the ID directly
      title: params.title as string,
      icon: params.icon as string || '✨',
      category: params.category as string || 'General',
      color: params.color as string || '#7C5CFF',
      frequency: params.frequency as 'daily' | 'weekly' | 'monthly',
      targetDays: JSON.parse(params.selectedDays as string),
      reminderTime: params.reminderEnabled === 'true' ? params.reminderTime as string : null,
      goalDays: selectedGoal,
    };

    addHabit(habitData);

    // Schedule reminders if enabled
    if (habitData.reminderTime) {
      const hasPermission = await notificationService.requestPermissions();
      if (hasPermission) {
        await notificationService.scheduleHabitReminder(
          tempId,
          habitData.title,
          habitData.icon,
          habitData.reminderTime,
          habitData.frequency,
          habitData.targetDays
        );
      }
    }
    
    router.dismissAll();
    router.replace('/(tabs)');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#FFF" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          <Text style={styles.icon}>{params.icon || '✨'}</Text>
          <Text style={styles.title}>Set your first streak goal for {params.title}</Text>
          <Text style={styles.sub}>Choose your starting goal and make it happen</Text>

          <View style={styles.goalsList}>
            {GOALS.map((goal) => (
              <TouchableOpacity
                key={goal.days}
                onPress={() => {
                   Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                   setSelectedGoal(goal.days);
                }}
                style={[
                  styles.goalCard,
                  selectedGoal === goal.days && styles.goalCardActive
                ]}
                activeOpacity={0.7}
              >
                <View style={styles.goalInfo}>
                  <View style={[styles.miniIconBg, selectedGoal === goal.days && styles.miniIconBgActive]}>
                    <Text style={styles.goalIcon}>{goal.icon}</Text>
                  </View>
                  <Text style={[styles.goalDays, selectedGoal === goal.days && styles.goalDaysActive]}>
                    {goal.days} days
                  </Text>
                </View>
                <Text style={[styles.goalLabel, selectedGoal === goal.days && styles.goalLabelActive]}>
                  {goal.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirm}>
          <Text style={styles.confirmBtnText}>I confirm my goal</Text>
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
  header: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  scrollContent: {
    paddingBottom: 120,
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: 25,
    marginTop: 10,
  },
  icon: {
    fontSize: 54,
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFF',
    textAlign: 'center',
    marginBottom: 10,
    lineHeight: 32,
  },
  sub: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.4)',
    textAlign: 'center',
    marginBottom: 35,
    fontWeight: '500',
  },
  goalsList: {
    width: '100%',
    gap: 12,
  },
  goalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.03)',
    height: 72,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  goalCardActive: {
    borderColor: 'rgba(255,255,255,0.2)',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  goalInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  miniIconBg: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  miniIconBgActive: {
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  goalIcon: {
    fontSize: 20,
  },
  goalDays: {
    fontSize: 16,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.8)',
  },
  goalDaysActive: {
    color: '#FFF',
  },
  goalLabel: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.3)',
    fontWeight: '600',
  },
  goalLabelActive: {
    color: 'rgba(255,255,255,0.5)',
  },
  footer: {
    position: 'absolute',
    bottom: 40,
    left: 20,
    right: 20,
  },
  confirmBtn: {
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
  confirmBtnText: {
    color: '#000',
    fontSize: 17,
    fontWeight: '800',
  }
});
