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
      currentStreak: 0,
      createdAt: Date.now(),
      pausedUntil: null
    };
    set((state) => ({ habits: [...state.habits, newHabit] }));
    if (get().userId) {
      fireSync(
        () => dbService.saveHabit(get().userId!, newHabit), 
        'addHabit', 
        get().userId,
        'habits',
        newHabit,
        newHabit.id
      );
      get().actions.refreshHabitNotifications();
      analyticsService.logEvent(get().userId, 'habit_added', { title: newHabit.title });
    }
  },

  removeHabit: (id) => set((state) => {
    const newHabits = state.habits.filter(h => h.id !== id);
    if (state.userId) {
      fireSync(
        () => dbService.deleteHabit(state.userId!, id), 
        'removeHabit', 
        state.userId,
        'habits',
        { id },
        id
      );
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

        const TWO_YEARS_AGO = formatLocalDate(new Date(Date.now() - 2 * 365 * 86400000));
        const isCompleted = h.completedDays.includes(today);
        let newCompletedDays = isCompleted
          ? h.completedDays.filter(d => d !== today)
          : [...h.completedDays, today];

        // Z-3: Prune stale completions (performance & doc size)
        if (newCompletedDays.length > 2000) {
          newCompletedDays = newCompletedDays.sort().slice(-2000);
        }
        newCompletedDays = newCompletedDays.filter(d => d >= TWO_YEARS_AGO);

        let currentStreak = 0;
        const todayForStreak = new Date();
        const todayStrForStreak = formatLocalDate(todayForStreak);
        const completedSet = new Set(newCompletedDays);
        const startOffset = completedSet.has(todayStrForStreak) ? 0 : 1;
        
        for (let i = startOffset; i < 365; i++) {
          const d = new Date();
          d.setDate(d.getDate() - i);
          const dStr = formatLocalDate(d);

          if (h.frequency === 'weekly' && !h.targetDays.includes(d.getDay())) continue;
          if (h.pausedUntil && dStr <= h.pausedUntil) continue;

          if (completedSet.has(dStr)) {
            currentStreak++;
          } else {
            break;
          }
        }

        // XP guard: only award once per habit per calendar day.
        // xpAwardedDays is never trimmed when unchecking, so re-completing the same
        // day never grants a second award.
        const xpAwardedDays = h.xpAwardedDays || [];
        const alreadyAwardedToday = xpAwardedDays.includes(today);
        const shouldAwardXP = !isCompleted && !alreadyAwardedToday;

        let newXpAwardedDays = xpAwardedDays;
        if (shouldAwardXP) {
          // Keep the list lean — prune anything older than 180 days
          const cutoff = formatLocalDate(new Date(Date.now() - 180 * 86400000));
          newXpAwardedDays = [...xpAwardedDays, today]
            .filter(d => d >= cutoff)
            .sort()
            .slice(-180);
        }

        const updatedHabit: Habit = {
          ...h,
          completedDays: newCompletedDays,
          currentStreak,
          bestStreak: Math.max(h.bestStreak || 0, currentStreak),
          xpAwardedDays: newXpAwardedDays,
        };

        if (state.userId) {
          fireSync(
            () => dbService.toggleHabitDate(state.userId!, id, newCompletedDays),
            'toggleHabit',
            state.userId,
            'habits',
            updatedHabit,
            updatedHabit.id
          );
        }

        let streakMilestone = null;
        if (!isCompleted) {
          const milestones = [7, 14, 30, 50, 100];
          if (milestones.includes(currentStreak)) {
            streakMilestone = { habitTitle: h.title, streak: currentStreak, timestamp: Date.now() };
          }
          // Only award XP if not already given today (idempotent guard)
          if (shouldAwardXP) {
            get().actions.addXP(10);
          }
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
      fireSync(
        () => dbService.saveHabit(state.userId!, updatedHabit), 
        'updateHabit', 
        state.userId,
        'habits',
        updatedHabit,
        updatedHabit.id
      );
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

    // M-4: Return precomputed streak for O(1) performance.
    // If not yet computed (legacy habit), we return 0 but it will be 
    // reconciled on the next toggle or daily reset.
    return habit.currentStreak || 0;
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
