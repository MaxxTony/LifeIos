import { useStore } from '@/store/useStore';
import * as Crypto from 'expo-crypto';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { notificationService } from '@/services/notificationService';
import { useThemeColors } from '@/hooks/useThemeColors';
import { Colors, Typography, Spacing, BorderRadius } from '@/constants/theme';



export default function GoalScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const colors = useThemeColors();
  const { actions: { addHabit, updateHabit } } = useStore();

  const isEditMode = !!params.habitId;
  const frequency = (params.frequency as 'daily' | 'weekly' | 'monthly') || 'daily';

  const GOALS = React.useMemo(() => {
    if (frequency === 'weekly') {
      return [
        { value: 4, label: 'Good', icon: '⭐', unit: 'weeks' },
        { value: 8, label: 'Great', icon: '🔥', unit: 'weeks' },
        { value: 12, label: 'Incredible', icon: '💫', unit: 'weeks' },
        { value: 24, label: 'Unstoppable', icon: '⚡', unit: 'weeks' },
      ];
    }
    if (frequency === 'monthly') {
      return [
        { value: 3,  label: 'Good Start',   icon: '⭐', unit: 'months' },
        { value: 6,  label: 'Committed',    icon: '🔥', unit: 'months' },
        { value: 9,  label: 'Incredible',   icon: '💫', unit: 'months' },
        { value: 12, label: 'Unstoppable',  icon: '⚡', unit: 'months' },
      ];
    }
    return [
      { value: 7, label: 'Good', icon: '⭐', unit: 'days' },
      { value: 14, label: 'Great', icon: '🔥', unit: 'days' },
      { value: 30, label: 'Incredible', icon: '💫', unit: 'days' },
      { value: 50, label: 'Unstoppable', icon: '⚡', unit: 'days' },
    ];
  }, [frequency]);

  const [selectedGoal, setSelectedGoal] = useState(() => {
    const existing = parseInt(params.goalDays as string);
    return isNaN(existing) ? GOALS[0].value : existing;
  });
  const [saving, setSaving] = useState(false);

  const handleConfirm = async () => {
    if (saving) return;
    setSaving(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    // Safely parse targetDays — malformed params must not crash the screen.
    let targetDays: number[] = [0, 1, 2, 3, 4, 5, 6];
    try {
      targetDays = JSON.parse(params.selectedDays as string);
    } catch {
      // Default to all days if params are somehow malformed
    }

    // B-2 FIX: reminderTime is '' (empty string) when reminders are off, not undefined
    const reminderTime = params.reminderEnabled === 'true' && params.reminderTime
      ? params.reminderTime as string
      : null;

    if (isEditMode) {
      // EDIT MODE: update existing habit without touching completedDays or streak
      const habitId = params.habitId as string;
      updateHabit(habitId, {
        title: params.title as string,
        icon: params.icon as string || '✨',
        category: params.category as string || 'General',
        color: params.color as string || colors.primary,
        frequency,
        targetDays,
        monthlyTarget: params.monthlyTarget ? parseInt(params.monthlyTarget as string) : undefined,
        monthlyDay: (params.monthlyDay && params.monthlyDay !== '') ? parseInt(params.monthlyDay as string) : undefined,
        reminderTime,
        goalDays: selectedGoal,
      });

      if (reminderTime) {
        const hasPermission = await notificationService.requestPermissions();
        if (hasPermission) {
          await notificationService.scheduleHabitReminder(
            habitId,
            params.title as string,
            params.icon as string || '✨',
            reminderTime,
            params.frequency as 'daily' | 'weekly' | 'monthly',
            targetDays,
            params.monthlyDay ? parseInt(params.monthlyDay as string) : undefined
          );
        }
      }

      setSaving(false);
      router.dismissAll();
      router.replace('/(tabs)');
      return;
    }

    // CREATE MODE
    const tempId = Crypto.randomUUID();

    const habitData = {
      id: tempId,
      title: params.title as string,
      icon: params.icon as string || '✨',
      category: params.category as string || 'General',
      color: params.color as string || colors.primary,
      frequency,
      targetDays,
      monthlyTarget: params.monthlyTarget ? parseInt(params.monthlyTarget as string) : undefined,
      monthlyDay: params.monthlyDay ? parseInt(params.monthlyDay as string) : undefined,
      reminderTime,
      goalDays: selectedGoal,
    };

    addHabit(habitData);

    if (habitData.reminderTime) {
      const hasPermission = await notificationService.requestPermissions();
      if (hasPermission) {
        await notificationService.scheduleHabitReminder(
          tempId,
          habitData.title,
          habitData.icon,
          habitData.reminderTime,
          habitData.frequency,
          habitData.targetDays,
          habitData.monthlyDay
        );
      }
    }

    setSaving(false);
    router.dismissAll();
    router.replace('/(tabs)');
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <Text style={styles.icon}>{params.icon || '✨'}</Text>
          <Text style={[styles.title, { color: colors.text }]}>{isEditMode ? 'Update your streak goal for' : 'Set your first streak goal for'} {params.title}</Text>
          <Text style={[styles.sub, { color: colors.textSecondary }]}>Choose your starting goal and make it happen</Text>

          <View style={styles.goalsList}>
            {GOALS.map((goal) => (
              <TouchableOpacity
                key={goal.value}
                onPress={() => {
                   Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                   setSelectedGoal(goal.value);
                }}
                style={[
                  styles.goalCard,
                  { backgroundColor: colors.isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)', borderColor: colors.border },
                  selectedGoal === goal.value && [styles.goalCardActive, { borderColor: colors.primary, backgroundColor: colors.primaryTransparent }]
                ]}
                activeOpacity={0.7}
              >
                <View style={styles.goalInfo}>
                  <View style={[styles.miniIconBg, { backgroundColor: colors.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }, selectedGoal === goal.value && [styles.miniIconBgActive, { backgroundColor: colors.primary + '20' }]]}>
                    <Text style={styles.goalIcon}>{goal.icon}</Text>
                  </View>
                  <Text style={[styles.goalDays, { color: colors.textSecondary }, selectedGoal === goal.value && [styles.goalDaysActive, { color: colors.primary }]]}>
                    {goal.value} {goal.unit}
                  </Text>
                </View>
                <Text style={[styles.goalLabel, { color: colors.textSecondary + '80' }, selectedGoal === goal.value && [styles.goalLabelActive, { color: colors.primary + 'A0' }]]}>
                  {goal.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.confirmBtn, { backgroundColor: colors.primary, shadowColor: colors.primary, opacity: saving ? 0.7 : 1 }]}
          onPress={handleConfirm}
          disabled={saving}
        >
          {saving
            ? <ActivityIndicator color="#FFF" />
            : <Text style={[styles.confirmBtnText, { color: '#FFF' }]}>{isEditMode ? 'Save changes' : 'I confirm my goal'}</Text>
          }
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    paddingBottom: 150,
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
    textAlign: 'center',
    marginBottom: 10,
    lineHeight: 32,
  },
  sub: {
    fontSize: 15,
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
    height: 72,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
  },
  goalCardActive: {
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  miniIconBgActive: {
  },
  goalIcon: {
    fontSize: 20,
  },
  goalDays: {
    fontSize: 16,
    fontWeight: '700',
  },
  goalDaysActive: {
  },
  goalLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  goalLabelActive: {
  },
  footer: {
    position: 'absolute',
    bottom: 40,
    left: 20,
    right: 20,
  },
  confirmBtn: {
    height: 64,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  confirmBtnText: {
    fontSize: 17,
    fontWeight: '800',
  }
});
