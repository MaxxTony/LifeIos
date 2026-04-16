import { StateCreator } from 'zustand';
import { UserState, Habit, HabitActions } from '../types';
import { dbService } from '@/services/dbService';
import { getTodayLocal, formatLocalDate } from '@/utils/dateUtils';
import * as Crypto from 'expo-crypto';
import { fireSync } from '../syncHelper';
import { analyticsService } from '@/services/analyticsService';

export const createHabitSlice: StateCreator<UserState, [["zustand/persist", unknown]], [], HabitActions> = (set, get) => ({
  addHabit: (habitData: Omit<Habit, 'completedDays' | 'bestStreak' | 'createdAt' | 'id' | 'pausedUntil'> & { id?: string }) => {
    const newHabit: Habit = {
      ...habitData,
      id: habitData.id || Crypto.randomUUID(),
      reminderTime: habitData.reminderTime ?? null,
      completedDays: [],
      bestStreak: 0,
      createdAt: Date.now(),
      pausedUntil: null
    };
    set((state) => ({ habits: [...state.habits, newHabit] }));
    if (get().userId) {
      fireSync(() => dbService.saveHabit(get().userId!, newHabit), 'addHabit', get().userId);
      get().actions.refreshHabitNotifications();
      analyticsService.logEvent(get().userId, 'habit_added', { title: newHabit.title });
    }
  },

  removeHabit: (id) => set((state) => {
    const newHabits = state.habits.filter(h => h.id !== id);
    if (state.userId) {
      fireSync(() => dbService.deleteHabit(state.userId!, id), 'removeHabit', state.userId);
    }

    setTimeout(() => {
      const { actions } = get();
      actions.checkQuestProgress('habit');
      actions.updateLifeScoreHistory();
    }, 0);

    return { habits: newHabits };
  }),

  toggleHabit: (id: string, dateStr?: string) => set((state) => {
    const newHabits = state.habits.map(h => {
      if (h.id === id) {
        const today = dateStr || getTodayLocal();
        if (h.pausedUntil && today <= h.pausedUntil) return h;

        const isCompleted = h.completedDays.includes(today);
        let newCompletedDays = isCompleted
          ? h.completedDays.filter(d => d !== today)
          : [...h.completedDays, today];

        if (newCompletedDays.length > 500) {
          newCompletedDays = newCompletedDays.sort().slice(-500);
        }

        let currentStreak = 0;
        const todayForStreak = new Date();
        const todayStrForStreak = formatLocalDate(todayForStreak);
        const startOffset = newCompletedDays.includes(todayStrForStreak) ? 0 : 1;
        
        for (let i = startOffset; i < 365; i++) {
          const d = new Date();
          d.setDate(d.getDate() - i);
          const dStr = formatLocalDate(d);

          if (h.frequency === 'weekly' && !h.targetDays.includes(d.getDay())) continue;
          if (h.pausedUntil && dStr <= h.pausedUntil) continue;

          if (newCompletedDays.includes(dStr)) {
            currentStreak++;
          } else {
            break;
          }
        }

        const updatedHabit = {
          ...h,
          completedDays: newCompletedDays,
          bestStreak: Math.max(h.bestStreak || 0, currentStreak)
        };

        if (state.userId) {
          fireSync(() => dbService.saveHabit(state.userId!, updatedHabit), 'toggleHabit', state.userId);
        }

        let streakMilestone = null;
        if (!isCompleted) {
          const milestones = [7, 14, 30, 50, 100];
          if (milestones.includes(currentStreak)) {
            streakMilestone = { habitTitle: h.title, streak: currentStreak, timestamp: Date.now() };
          }
          get().actions.addXP(10);
          analyticsService.logEvent(state.userId, 'habit_completed', { title: h.title, streak: currentStreak });
        } else {
          analyticsService.logEvent(state.userId, 'habit_uncompleted', { title: h.title });
        }

        if (streakMilestone) {
          setTimeout(() => {
            import('react-native-toast-message').then(Toast => {
              Toast.default.show({
                type: 'success',
                text1: 'Milestone Reached! 🔥',
                text2: `You hit a ${streakMilestone.streak}-day streak for ${h.title}!`
              });
            });
            get().actions.triggerProactivePrompt(
              'milestone', 
              `Incredible consistency! You just hit a ${streakMilestone.streak}-day streak for ${h.title}. How does it feel to be this focused?`
            );
          }, 500);
        }

        setTimeout(() => {
          const { actions } = get();
          actions.checkQuestProgress('habit');
          actions.updateLifeScoreHistory();
        }, 0);

        return {
          ...updatedHabit,
          streakMilestone
        };
      }
      return h;
    });
    return { habits: newHabits };
  }),

  updateHabit: (id: string, updates: Partial<Habit>) => set((state) => {
    const newHabits = state.habits.map(h => h.id === id ? { ...h, ...updates } : h);
    const updatedHabit = newHabits.find(h => h.id === id);
    if (state.userId && updatedHabit) {
      fireSync(() => dbService.saveHabit(state.userId!, updatedHabit), 'updateHabit', state.userId);
      get().actions.refreshHabitNotifications();
    }
    return { habits: newHabits };
  }),

  pauseHabit: (id: string, until: string | null) => set((state) => {
    const newHabits = state.habits.map(h => h.id === id ? { ...h, pausedUntil: until } : h);
    const updatedHabit = newHabits.find(h => h.id === id);
    if (state.userId && updatedHabit) {
      fireSync(() => dbService.saveHabit(state.userId!, updatedHabit), 'pauseHabit', state.userId);
    }
    return { habits: newHabits };
  }),

  getStreak: (id: string) => {
    const habit = get().habits.find(h => h.id === id);
    if (!habit) return 0;

    const isScheduledDay = (date: Date): boolean => {
      if (habit.frequency !== 'weekly') return true;
      return habit.targetDays.includes(date.getDay());
    };

    let streak = 0;
    const today = new Date();
    const todayStr = formatLocalDate(today);
    const todayDone = habit.completedDays.includes(todayStr);
    const startOffset = todayDone ? 0 : 1;

    for (let i = startOffset; i < 365; i++) {
      const checkDate = new Date();
      checkDate.setDate(today.getDate() - i);
      if (!isScheduledDay(checkDate)) continue;
      const dateStr = formatLocalDate(checkDate);
      if (habit.pausedUntil && dateStr <= habit.pausedUntil) continue;
      if (habit.completedDays.includes(dateStr)) {
        streak++;
      } else {
        break;
      }
    }
    return streak;
  },

  refreshHabitNotifications: async () => {
    const { habits } = get();
    try {
      const { notificationService } = await import('@/services/notificationService');
      const hasPermission = await notificationService.requestPermissions();
      if (!hasPermission) return;

      for (const habit of habits) {
        if (habit.reminderTime) {
          await notificationService.scheduleHabitReminder(
            habit.id, habit.title, habit.icon, habit.reminderTime, habit.frequency, habit.targetDays
          );
        } else {
          await notificationService.cancelHabitReminders(habit.id);
        }
      }
    } catch (err) {
      console.error('[LifeOS] Failed to refresh notifications:', err);
    }
  },
});
